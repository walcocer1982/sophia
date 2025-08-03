import { Fragment, Moment } from '../types';
import { OpenAIService } from './OpenAIService';
import { SessionManager } from './SessionManager';

export class VectorStoreService {
  private openAIService: OpenAIService;
  private sessionManager: SessionManager;

  constructor(openAIService: OpenAIService, sessionManager: SessionManager) {
    this.openAIService = openAIService;
    this.sessionManager = sessionManager;
  }

  /**
   * Busca fragmentos en el vector store
   */
  async searchFragmentos(vectorStoreId: string, query: string, maxResults: number = 3): Promise<Fragment[]> {
    try {
      const results = await this.openAIService.searchVectorStore(vectorStoreId, query, maxResults);
      
      return results.map(result => ({
        texto: result.text || result.content || '',
        score: result.score || 0
      }));
    } catch (error) {
      console.error('Error buscando fragmentos:', error);
      return [];
    }
  }

  /**
   * Pre-calcula fragmentos para cada momento usando paralelización
   */
  async preCalculateFragmentos(vectorStoreId: string, momentos: Moment[], expectedTheme: string): Promise<Fragment[]> {
    console.log(`⚡ Pre-calculando fragmentos para ${momentos.length} momentos...`);
    
    // Paralelización con Promise.all para mejor rendimiento
    const fragmentPromises = momentos.map(async (momento) => {
      const cacheKey = `${vectorStoreId}-${momento.momento}-${expectedTheme}`;
      
      // Verificar caché primero
      if (this.sessionManager.hasCache(cacheKey)) {
        console.log(`✅ Fragmentos en caché para ${momento.momento}`);
        return this.sessionManager.getFromCache(cacheKey);
      }

      try {
        const fragmentos = await this.searchFragmentos(
          vectorStoreId, 
          `${momento.momento} ${expectedTheme}`,
          3
        );

        // Guardar en caché
        this.sessionManager.setCache(cacheKey, fragmentos);
        console.log(`✅ Fragmentos calculados para ${momento.momento}: ${fragmentos.length}`);
        
        return fragmentos;
      } catch (error) {
        console.error(`❌ Error pre-calculando fragmentos para ${momento.momento}:`, error);
        return [];
      }
    });

    // Ejecutar todas las búsquedas en paralelo
    const results = await Promise.all(fragmentPromises);
    
    // Aplanar resultados
    const allFragmentos = results.flat();
    console.log(`✅ Total fragmentos pre-calculados: ${allFragmentos.length}`);
    
    return allFragmentos;
  }

  /**
   * Extrae momentos usando el servicio de OpenAI
   */
  async extractMomentosWithPrecision(
    vectorStoreId: string, 
    fileId: string, 
    fileName: string, 
    course: any, 
    session: any, 
    expectedTheme: string
  ): Promise<Moment[]> {
    try {
      const { PromptBuilder } = await import('./PromptBuilder');
      
      const userPrompt = PromptBuilder.buildMomentosExtractionPrompt(
        course.name, 
        session.name, 
        fileId
      );

      const { response } = await this.openAIService.callOpenAI({
        systemPrompt: `Eres un sistema que identifica secciones pedagógicas clave en documentos del curso ${course.name}. IMPORTANTE: Debes responder ÚNICAMENTE en formato JSON válido, sin texto adicional.`,
        userPrompt,
        vectorStoreIds: [vectorStoreId],
        maxResults: 10,
        model: 'gpt-4o' // Usar gpt-4o para extracción de momentos
      });

      const momentos = this.parseJSONResponse(response.output_text);
      
      // Validar que los momentos correspondan al tema
      this.sessionManager.validateMomentosTheme(momentos, expectedTheme);
      
      return momentos;
    } catch (error) {
      console.error('Error extrayendo momentos con precisión:', error);
      throw error;
    }
  }

  /**
   * Valida que un archivo existe en el vector store
   */
  async validateFileExists(vectorStoreId: string, fileId: string): Promise<boolean> {
    return await this.openAIService.validateFileExists(vectorStoreId, fileId);
  }

  /**
   * Parsea respuesta JSON del modelo
   */
  private parseJSONResponse(responseText: string): Moment[] {
    try {
      // Buscar JSON en la respuesta (varios formatos de markdown)
      const jsonMatch = responseText.match(/```(?:json|js)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Buscar JSON sin markdown
      const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }
      
      // Si no hay markdown, intentar parsear directamente
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error parseando JSON:', error);
      return [];
    }
  }

  /**
   * Obtiene fragmentos para un momento específico
   */
  async getFragmentosForMoment(
    vectorStoreId: string, 
    momento: string, 
    expectedTheme: string
  ): Promise<Fragment[]> {
    const cacheKey = `${vectorStoreId}-${momento}-${expectedTheme}`;
    
    if (this.sessionManager.hasCache(cacheKey)) {
      return this.sessionManager.getFromCache(cacheKey);
    }

    const fragmentos = await this.searchFragmentos(
      vectorStoreId,
      `${momento} ${expectedTheme}`,
      3
    );

    this.sessionManager.setCache(cacheKey, fragmentos);
    return fragmentos;
  }
} 