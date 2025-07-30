import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { ChatInterface } from "@/components/ChatInterface";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            DocenteIA
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Sistema estable con Next.js, TypeScript e IA
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Comenzar
            </Button>
            <Button variant="outline" size="lg">
              Documentación
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16 mb-16">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              TypeScript Estricto
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Configuración robusta con verificaciones estrictas de tipos para mayor estabilidad.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Next.js 14
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              La versión más estable con App Router y optimizaciones avanzadas.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              OpenAI Integrado
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Chat inteligente con GPT-3.5-turbo para asistencia automática.
            </p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="mt-16">
          <ChatInterface />
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Última actualización: {formatDate(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
}
