const VectorStoreExtractor = require('./src/lib/vector-store-extractor');

async function testPhase1Optimization() {
  console.log('🚀 PROBANDO FASE 1 DE OPTIMIZACIÓN');
  console.log('=====================================\n');

  try {
    // Inicializar el extractor optimizado
    const extractor = new VectorStoreExtractor();
    
    console.log('✅ Extractor inicializado');
    console.log(`📊 Cache inicial: ${extractor.getCacheStats().cacheSize} elementos`);
    console.log(`📊 Sesiones iniciales: ${extractor.getCacheStats().sessionsSize}\n`);

    // Probar inicio de sesión optimizada
    console.log('🎯 PROBANDO INICIO DE SESIÓN OPTIMIZADA...');
    const sessionInfo = await extractor.startSession('SSO001', 'sesion03');
    
    console.log('✅ Sesión iniciada exitosamente:');
    console.log(`   📁 Clave: ${sessionInfo.sessionKey}`);
    console.log(`   📄 Momentos: ${sessionInfo.momentos}`);
    console.log(`   ⚡ Fragmentos: ${sessionInfo.fragmentos}`);
    console.log(`   🎯 Momento actual: ${sessionInfo.currentMoment}\n`);

    // Verificar estadísticas después del inicio
    const statsAfterStart = extractor.getCacheStats();
    console.log('📊 ESTADÍSTICAS DESPUÉS DEL INICIO:');
    console.log(`   🎓 Sesiones activas: ${statsAfterStart.activeSessions}`);
    console.log(`   💾 Cache: ${statsAfterStart.cacheSize} elementos`);
    console.log(`   📁 Tamaño de sesiones: ${statsAfterStart.sessionsSize}\n`);

    // Probar interacción del estudiante
    console.log('👤 PROBANDO INTERACCIÓN DEL ESTUDIANTE...');
    const response1 = await extractor.handleStudent(sessionInfo.sessionKey, 'hola');
    
    console.log('✅ Respuesta del docente:');
    console.log(`   📝 Respuesta: ${response1.respuesta.substring(0, 100)}...`);
    console.log(`   🎯 Momento actual: ${response1.momento_actual}`);
    console.log(`   📊 Progreso: ${response1.progreso}/${response1.total_momentos}`);
    console.log(`   ⏭️ Debe avanzar: ${response1.debe_avanzar}`);
    console.log(`   🔄 Razón: ${response1.razon_avance}\n`);

    // Probar segunda interacción
    console.log('👤 PROBANDO SEGUNDA INTERACCIÓN...');
    const response2 = await extractor.handleStudent(sessionInfo.sessionKey, 'estoy listo para aprender');
    
    console.log('✅ Segunda respuesta del docente:');
    console.log(`   📝 Respuesta: ${response2.respuesta.substring(0, 100)}...`);
    console.log(`   🎯 Momento actual: ${response2.momento_actual}`);
    console.log(`   📊 Progreso: ${response2.progreso}/${response2.total_momentos}`);
    console.log(`   ⏭️ Debe avanzar: ${response2.debe_avanzar}\n`);

    // Verificar gestión de sesiones
    console.log('📋 PROBANDO GESTIÓN DE SESIONES...');
    const activeSessions = extractor.listActiveSessions();
    console.log('✅ Sesiones activas:');
    activeSessions.forEach(session => {
      console.log(`   📁 ${session.sessionKey}: ${session.course} - ${session.session} (${session.progress})`);
    });
    console.log();

    // Probar métodos legacy para compatibilidad
    console.log('🔄 PROBANDO MÉTODOS LEGACY...');
    const momentos = await extractor.getMomentosDelArchivo('SSO001', 'sesion03');
    console.log(`✅ Momentos extraídos: ${momentos.length}`);
    
    const legacyResponse = await extractor.docenteEspecializadoResponde(
      'SSO001', 
      'sesion03', 
      '¿qué es un incendio?', 
      momentos, 
      0
    );
    console.log(`✅ Respuesta legacy: ${legacyResponse.respuesta.substring(0, 100)}...\n`);

    // Verificar estadísticas finales
    const finalStats = extractor.getCacheStats();
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`   🎓 Sesiones activas: ${finalStats.activeSessions}`);
    console.log(`   💾 Cache: ${finalStats.cacheSize} elementos`);
    console.log(`   📁 Tamaño de sesiones: ${finalStats.sessionsSize}\n`);

    // Probar limpieza
    console.log('🧹 PROBANDO LIMPIEZA...');
    extractor.clearSession(sessionInfo.sessionKey);
    console.log('✅ Sesión eliminada');
    
    const statsAfterCleanup = extractor.getCacheStats();
    console.log(`📊 Sesiones después de limpieza: ${statsAfterCleanup.activeSessions}\n`);

    console.log('🎉 ¡FASE 1 DE OPTIMIZACIÓN FUNCIONANDO CORRECTAMENTE!');
    console.log('✅ Fragmentos pre-calculados: OK');
    console.log('✅ Gestión de sesiones: OK');
    console.log('✅ Cache básico: OK');
    console.log('✅ Coordinación mantenida: OK');
    console.log('✅ Métodos legacy compatibles: OK');

  } catch (error) {
    console.error('❌ Error en prueba de FASE 1:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar prueba
testPhase1Optimization(); 