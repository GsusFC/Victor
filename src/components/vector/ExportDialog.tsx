import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVectorStore } from '@/lib/store';
import { Check, Download, Clipboard, Code2, FileCode } from 'lucide-react';
import type { ExtendedVectorItem } from '@/components/vector/core/vectorTypes';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'svg' | 'js' | 'framer'>('svg');
  const [minified, setMinified] = useState<{ svg: boolean; js: boolean; framer: boolean }>({ svg: false, js: false, framer: false });

  // Acceder a los datos necesarios del store de forma optimizada
  const svgLines = useVectorStore((state) => state.svgLines);
  const settings = useVectorStore((state) => state.settings);
  
  // Obtener dimensiones calculadas del store
  const calculatedValues = useVectorStore((state) => state.calculatedValues);
  const logicalWidth = calculatedValues?.logicalWidth || 800;
  const logicalHeight = calculatedValues?.logicalHeight || 600;
  const gridCols = calculatedValues?.gridCols || 20;

  const handleCopy = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(`Código ${type} copiado!`);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Error al copiar el texto: ', err);
      setCopySuccess('Error al copiar');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  }, []);

  const handleDownload = useCallback((content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Función para normalizar el aspecto basado en el string de aspect ratio
  const getAspectRatio = (aspect: string | undefined): number => {
    if (!aspect) return 2; // Default 2:1
    if (aspect === '1:1') return 1;
    if (aspect === '16:9') return 16/9;
    return 2; // Fallback
  };

  // Generar código SVG con useMemo para rendimiento
  const svgCode = useMemo(() => {
    if (!svgLines?.length || !settings) return '<!-- No hay datos suficientes para exportar -->';
    
    // Usar dimensiones lógicas directamente para asegurar consistencia
    const viewBoxWidth = logicalWidth;
    const viewBoxHeight = logicalHeight;

    // Función centralizada para crear elementos SVG que captura la posición real
    const createSvgElement = (vector: ExtendedVectorItem): string => {
      // Extraer los datos del vector
      const { id, shape, baseX, baseY, currentAngle, lengthFactor = 1.0 } = vector;
      
      // Calcular la longitud actual del vector (considerando el factor dinámico si existe)
      const actualLength = settings.vectorLength * (lengthFactor || 1.0);
      
      // Propiedades de estilo comunes
      const stroke = `stroke="${settings.vectorColor ?? '#FFFFFF'}" stroke-width="${settings.vectorStrokeWidth ?? 2}" stroke-linecap="${settings.strokeLinecap ?? 'round'}"`;
      
      // Para la rotación, necesitamos el punto de origen correcto
      // Usar rotationOrigin si está disponible, de lo contrario usar 'center'
      const rotationOrigin = settings.rotationOrigin || 'center';
      
      // Calcular el offset de rotación basado en el punto de origen
      let rotationOffsetX = 0;
      switch (rotationOrigin) {
        case 'start':
          rotationOffsetX = 0;
          break;
        case 'center':
          rotationOffsetX = actualLength / 2;
          break;
        case 'end':
          rotationOffsetX = actualLength;
          break;
      }
      
      // Transformación que incluye la posición real y el ángulo actual
      const transform = `transform="translate(${baseX}, ${baseY}) rotate(${currentAngle}, ${rotationOffsetX}, 0)"`;
      
      // Manejar las diferentes formas de vectores
      switch(shape) {
        case 'line':
          // Línea simple
          return `<line x1="0" y1="0" x2="${actualLength}" y2="0" ${stroke} ${transform}/>`;
          
        case 'arrow':
          // Flecha
          return `<g ${transform}><line x1="0" y1="0" x2="${actualLength - 5}" y2="0" ${stroke}/><polygon points="${actualLength},0 ${actualLength - 5},-2.5 ${actualLength - 5},2.5" fill="${settings.vectorColor ?? '#FFFFFF'}" /></g>`;
          
        case 'dot':
          // Punto
          return `<circle cx="${actualLength / 2}" cy="0" r="${(settings.vectorWidth ?? 2) * 1.5}" fill="${settings.vectorColor ?? '#FFFFFF'}" ${transform}/>`;
          
        case 'triangle':
          // Triángulo
          const angle1 = Math.PI * 0.8; // 144 grados
          const angle2 = -Math.PI * 0.8; // -144 grados
          const tipX = actualLength;
          const p1X = actualLength * 0.4 * Math.cos(angle1);
          const p1Y = actualLength * 0.4 * Math.sin(angle1);
          const p2X = actualLength * 0.4 * Math.cos(angle2);
          const p2Y = actualLength * 0.4 * Math.sin(angle2);
          
          return `<polygon points="${tipX},0 ${p1X},${p1Y} ${p2X},${p2Y}" fill="${settings.vectorColor ?? '#FFFFFF'}" ${transform}/>`;
          
        case 'semicircle':
          // Semicírculo
          const radius = actualLength / 2;
          return `<path d="M 0 0 A ${radius} ${radius} 0 0 1 ${actualLength} 0" fill="none" ${stroke} ${transform}/>`;
          
        case 'curve':
          // Curva
          const curveHeight = actualLength * 0.3;
          return `<path d="M 0 0 Q ${actualLength/2} ${-curveHeight} ${actualLength} 0" fill="none" ${stroke} ${transform}/>`;
          
        default:
          // Línea por defecto
          return `<line x1="0" y1="0" x2="${actualLength}" y2="0" ${stroke} ${transform}/>`;
      }
    };
    
    // Creamos el SVG con todos los elementos
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${viewBoxWidth}" height="${viewBoxHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${settings.backgroundColor ?? '#000000'}"/>
  ${svgLines.map(vector => createSvgElement(vector)).join('\n')}
</svg>`;
  }, [svgLines, settings, logicalWidth, logicalHeight, gridCols]);

  // Generar código JavaScript con useMemo para rendimiento
  const jsCode = useMemo(() => {
    // Si no hay suficientes datos, devolver código mínimo
    if (!svgLines?.length || !settings) return '// No hay datos suficientes para exportar';
    
    // Obtener valores seguros con fallbacks
    const bgColor = settings.backgroundColor ?? '#000000';
    const vColor = settings.vectorColor ?? '#FFFFFF';
    const vWidth = settings.vectorWidth ?? 2;
    const vLength = settings.vectorLength ?? 30;
    const aSpeed = settings.animationSpeed ?? 1;
    const rows = settings.gridRows ?? 15;
    const spacing = settings.vectorSpacing ?? 20;
    const shape = settings.vectorShape ?? 'line';
    
    return `// Vector Animation JavaScript
// Generado automáticamente
const canvas = document.getElementById('vectorCanvas');
const ctx = canvas.getContext('2d');

// Configuración
const config = {
  width: ${logicalWidth},
  height: ${logicalHeight},
  backgroundColor: '${bgColor}',
  vectorColor: '${vColor}',
  vectorWidth: ${vWidth},
  vectorLength: ${vLength},
  animationSpeed: ${aSpeed}
};

// Limpiar canvas
function clearCanvas() {
  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, config.width, config.height);
}

// Dibujar vector
function drawVector(x, y, angle, shape = 'line') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * Math.PI / 180);
  
  ctx.strokeStyle = config.vectorColor;
  ctx.lineWidth = config.vectorWidth;
  ctx.lineCap = 'round';
  
  switch(shape) {
    case 'line':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(config.vectorLength, 0);
      ctx.stroke();
      break;
      
    case 'arrow':
      // Línea principal
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(config.vectorLength - 5, 0);
      ctx.stroke();
      
      // Punta de flecha
      ctx.fillStyle = config.vectorColor;
      ctx.beginPath();
      ctx.moveTo(config.vectorLength, 0);
      ctx.lineTo(config.vectorLength - 5, -2.5);
      ctx.lineTo(config.vectorLength - 5, 2.5);
      ctx.closePath();
      ctx.fill();
      break;
      
    // Otros tipos de formas...
    default:
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(config.vectorLength, 0);
      ctx.stroke();
  }
  
  ctx.restore();
}

// Animación principal
let animationFrame;
let timestamp = 0;

function animate() {
  clearCanvas();
  timestamp += 0.01 * config.animationSpeed;
  
  // Dibujar vectores
  // Aquí se dibujarían todos los vectores con sus ángulos calculados
  
  const rows = ${rows};
  const cols = ${gridCols};
  const spacing = ${spacing};
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * spacing;
      const y = r * spacing;
      
      // Ejemplo simple con ondas suaves
      const angle = Math.sin(timestamp + x * 0.01) * 45;
      
      drawVector(x, y, angle, '${shape}');
    }
  }
  
  animationFrame = requestAnimationFrame(animate);
}

// Iniciar animación
animate();

// Función para detener la animación
function stopAnimation() {
  cancelAnimationFrame(animationFrame);
}`;
  }, [svgLines, settings, logicalWidth, logicalHeight, gridCols]);

  // Generar código Framer Motion con useMemo para rendimiento
  const framerComponentCode = useMemo(() => {
    if (!settings) return '// No hay datos suficientes para exportar';
    
    // Valores por defecto para Framer
    const framerWaterfallProps = {
      waterfallTurbulence: settings.waterfallTurbulence ?? 15,
      waterfallTurbulenceSpeed: settings.waterfallTurbulenceSpeed ?? 0.003,
      waterfallOffsetFactor: settings.waterfallOffsetFactor ?? 0.2,
      waterfallGravityCycle: settings.waterfallGravityCycle ?? 2000,
      waterfallGravityStrength: settings.waterfallGravityStrength ?? 0.5,
      waterfallMaxStretch: settings.waterfallMaxStretch ?? 1.5,
      waterfallDriftStrength: settings.waterfallDriftStrength ?? 0.2
    };
    
    return `// Componente Framer Motion para animación de vectores
// Este código generado funciona mejor con la animación de waterfall
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// Define las propiedades del componente
interface VectorFramerProps {
  width?: number;
  height?: number;
  backgroundColor?: string;
  rows?: number;
  cols?: number;
  spacing?: number;
  shape?: string;
  vectorColor?: string;
  vectorWidth?: number;
  animationType?: string;
  
  // Parámetros para waterfall
  waterfallTurbulence?: number;
  waterfallTurbulenceSpeed?: number;
  waterfallOffsetFactor?: number;
  waterfallGravityCycle?: number;
  waterfallGravityStrength?: number;
  waterfallMaxStretch?: number;
  waterfallDriftStrength?: number;
}

export const VectorFramer: React.FC<VectorFramerProps> = ({
  width = 800,
  height = 450,
  backgroundColor = "#000000",
  rows = 15,
  cols = 25,
  spacing = 20,
  shape = "line",
  vectorColor = "#FFFFFF",
  vectorWidth = 2,
  animationType = "waterfall",
  
  // Valores por defecto para waterfall
  waterfallTurbulence = ${framerWaterfallProps.waterfallTurbulence},
  waterfallTurbulenceSpeed = ${framerWaterfallProps.waterfallTurbulenceSpeed},
  waterfallOffsetFactor = ${framerWaterfallProps.waterfallOffsetFactor},
  waterfallGravityCycle = ${framerWaterfallProps.waterfallGravityCycle},
  waterfallGravityStrength = ${framerWaterfallProps.waterfallGravityStrength},
  waterfallMaxStretch = ${framerWaterfallProps.waterfallMaxStretch},
  waterfallDriftStrength = ${framerWaterfallProps.waterfallDriftStrength}
}) => {
  // Calcular el tamaño real del viewBox
  const svgWidth = cols * spacing;
  const svgHeight = rows * spacing;
  
  // Crear array de vectores
  const vectors = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      vectors.push({
        id: \"v-\${r}-\${c}\",
        x: c * spacing,
        y: r * spacing,
        row: r,
        col: c
      });
    }
  }
  
  // Renderizar el componente
  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px'
      }}
    >
      <svg width={width} height={height} viewBox={\"0 0 \${svgWidth} \${svgHeight}\"}>
        {vectors.map((vector, index) => {
          // Calcular delay basado en posición Y para efecto cascada
          const cascadeDelay = 
            animationType === "waterfall" 
              ? (vector.y / svgHeight) * waterfallOffsetFactor * 5
              : index * 0.05;
          
          // Determinar rotación según el tipo de animación
          const rotate = 
            animationType === "waterfall" 
              ? [
                  90, // Posición inicial (caída vertical)
                  90 + waterfallTurbulence * 0.5, // Desviación derecha
                  90 - waterfallTurbulence * 0.5, // Desviación izquierda
                  90  // Volver a posición vertical
                ]
              : [0, 15, -15, 0]; // Animación default
              
          // Duración de la animación
          const duration = 
            animationType === "waterfall"
              ? 3 * (1 / (waterfallTurbulenceSpeed * 1000))
              : 5;
          
          return (
            <motion.g
              key={vector.id}
              initial={{ rotate: 90 }}
              animate={{ rotate }}
              transition={{
                duration,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut",
                delay: cascadeDelay
              }}
            >
              {/* Renderizar el vector según su forma */}
              {shape === "line" && (
                <line
                  transform={\"translate(\${vector.x}, \${vector.y})\"}
                  x1={0}
                  y1={0}
                  x2={spacing * 0.8}
                  y2={0}
                  stroke={vectorColor}
                  strokeWidth={vectorWidth}
                  strokeLinecap="round"
                />
              )}
              
              {shape === "arrow" && (
                <g transform={\"translate(\${vector.x}, \${vector.y})\"}>
                  <line
                    x1={0}
                    y1={0}
                    x2={spacing * 0.7}
                    y2={0}
                    stroke={vectorColor}
                    strokeWidth={vectorWidth}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={\"\${spacing * 0.8},0 \${spacing * 0.7},-3 \${spacing * 0.7},3\"}
                    fill={vectorColor}
                  />
                </g>
              )}
              
              {/* Otros tipos de vectores pueden añadirse según necesidad */}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

// Ejemplo de uso:
// <VectorFramer
//   animationType="waterfall"
//   waterfallTurbulence={15}
//   waterfallTurbulenceSpeed={0.003}
//   waterfallOffsetFactor={0.2}
// />
`;
  }, [settings?.waterfallTurbulence, settings?.waterfallTurbulenceSpeed, settings?.waterfallOffsetFactor, 
      settings?.waterfallGravityCycle, settings?.waterfallGravityStrength, settings?.waterfallMaxStretch, 
      settings?.waterfallDriftStrength]);

  // Funciones de minificación para cada tipo de código
  const minifyCode = useCallback((code: string, type: 'svg' | 'js' | 'framer'): string => {
    if (!code || code.trim() === '') return code;
    
    switch (type) {
      case 'svg':
        // Minificar SVG: eliminar espacios extra, unir etiquetas adyacentes
        return code
          .replace(/<!--[\s\S]*?-->/g, '') // Eliminar comentarios
          .replace(/[\r\n\t]+/g, ' ') // Reemplazar saltos de línea y tabs por espacios
          .replace(/\s+/g, ' ') // Reducir múltiples espacios a uno solo
          .replace(/> </g, '><') // Combinar etiquetas adyacentes
          .replace(/\s+\/>/g, '/>') // Limpiar espacios antes de cierre de etiquetas auto-cerradas
          .replace(/ ([\w-]+)="([^"]+)"/g, ' $1="$2"') // Mantener atributos sin espacios extra
          .trim();

      case 'js':
        // Minificar JS: preserva cierta estructura para debugging mientras reduce tamaño
        return code
          .replace(/\/\/[^\n]*/g, '') // Eliminar comentarios de una línea
          .split('\n')
          .map(line => line.trim())
          .filter(line => line !== '') // Eliminar líneas vacías
          .join(' ')
          .replace(/\s*([\{\}\(\)\[\]\,\;\:\+\-\*\/\=\?\!\&\|\<\>])\s*/g, '$1') // Eliminar espacios alrededor de operadores
          .replace(/\s{2,}/g, ' '); // Reducir múltiples espacios a uno solo

      case 'framer':
        // Minificar Framer/React: preserva imports y estructura de componentes para legibilidad
        const lines = code.split('\n');
        const processedLines = [];
        
        // Preservar imports y exports pero compactar resto
        let inComment = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Saltar líneas vacías
          if (line === '') continue;
          
          // Manejar comentarios multi-línea
          if (line.includes('/*')) inComment = true;
          if (inComment) {
            if (line.includes('*/')) inComment = false;
            continue;
          }
          
          // Saltar comentarios de una línea
          if (line.startsWith('//')) continue;
          
          // Preservar imports y exports con salto de línea
          if (line.startsWith('import ') || line.startsWith('export ')) {
            processedLines.push(line);
          } else {
            // Para el resto del código, compactar
            processedLines.push(line);
          }
        }
        
        // Unir todo con espacios pero preservar estructura básica
        return processedLines
          .join('\n')
          .replace(/\s*([\{\}\(\)\[\]\,\;\:\+\-\*\/\=\?\!\&\|\<\>])\s*/g, '$1') // Eliminar espacios alrededor de operadores
          .replace(/\s{2,}/g, ' ') // Reducir múltiples espacios a uno solo
          .replace(/import/g, '\nimport') // Preservar saltos de línea en imports
          .replace(/export const/g, '\nexport const'); // Preservar saltos de línea en exports

      default:
        return code;
    }
  }, []);
  
  // Código final según pestaña y estado de minificación
  const finalCode = useMemo(() => {
    const code = activeTab === 'svg' ? svgCode : activeTab === 'js' ? jsCode : framerComponentCode;
    return minified[activeTab] ? minifyCode(code, activeTab) : code;
  }, [activeTab, svgCode, jsCode, framerComponentCode, minified, minifyCode]);
  
  // Estadísticas del código generado
  const codeStats = useMemo(() => {
    return {
      svg: {
        lines: svgCode.split('\n').length,
        chars: svgCode.length,
        paths: svgLines?.length ?? 0
      },
      js: {
        lines: jsCode.split('\n').length,
        chars: jsCode.length,
        functions: (jsCode.match(/function/g) ?? []).length
      },
      framer: {
        lines: framerComponentCode.split('\n').length,
        chars: framerComponentCode.length,
      }
    };
  }, [svgCode, jsCode, framerComponentCode, svgLines?.length]);

  const previewLines = useMemo(() => {
    return (activeTab === 'svg' ? svgCode : activeTab === 'js' ? jsCode : framerComponentCode).split('\n').slice(0, 5).join('\n');
  }, [activeTab, svgCode, jsCode, framerComponentCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-muted p-0">
        <DialogHeader className="px-6 py-3 flex flex-row items-center justify-between border-b border-input">
          <DialogTitle className="text-sm font-mono uppercase text-foreground">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              <span>Exportar Vector Art</span>
            </div>
          </DialogTitle>
          
          <Tabs
            defaultValue="svg"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'svg' | 'js' | 'framer')}
            className="w-auto"
          >
            <TabsList className="h-8 bg-background">
              <TabsTrigger
                value="svg"
                className="text-xs px-2 data-[state=active]:bg-foreground data-[state=active]:text-background"
              >
                <FileCode className="w-3 h-3" /> SVG
              </TabsTrigger>
              <TabsTrigger
                value="js"
                className="text-xs px-2 data-[state=active]:bg-foreground data-[state=active]:text-background"
              >
                <Code2 className="w-3 h-3" /> JavaScript
              </TabsTrigger>
              <TabsTrigger
                value="framer"
                className="text-xs px-2 data-[state=active]:bg-foreground data-[state=active]:text-background"
              >
                <Code2 className="w-3 h-3" /> Framer
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4 pt-2 bg-background">
          {/* Preview inicial */}
          <div className="bg-muted rounded-none border border-input mb-2 p-3 text-xs text-muted-foreground font-mono relative">
            <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full uppercase font-mono">
              {activeTab === 'svg' ? 'svg' : activeTab === 'js' ? 'javascript' : 'framer'}
            </div>
            <pre className="overflow-hidden max-h-[100px] font-mono">
              {previewLines}
              {(activeTab === 'svg' ? svgCode : activeTab === 'js' ? jsCode : framerComponentCode).split('\n').length > 5 && (
                <div className="h-8 bg-gradient-to-b from-transparent to-muted absolute bottom-0 left-0 right-0"></div>
              )}
            </pre>
          </div>

          {/* Scrollable completo */}
          <div className="flex-1 overflow-hidden flex flex-col bg-background rounded-none border border-input">
            <div className="p-2 bg-muted flex items-center justify-between border-b border-input">
              <div className="flex space-x-1 items-center">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground font-mono ml-2">
                  {activeTab === 'svg' ? 'vector.svg' : activeTab === 'js' ? 'vector-animation.js' : 'VectorFramer.tsx'}
                </span>
              </div>

              <span className="text-xs text-muted-foreground font-mono">
                {activeTab === 'svg' 
                  ? `${codeStats.svg.lines} líneas, ${codeStats.svg.paths} elementos` 
                  : activeTab === 'js'
                    ? `${codeStats.js.lines} líneas, ${codeStats.js.functions ?? 0} funciones`
                    : `${codeStats.framer.lines} líneas`}
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              <pre className="p-4 text-sm font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed bg-background">
                {finalCode}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 border-t border-input bg-muted">
          <div className="flex gap-2">
            <Button
              onClick={() => setMinified(prev => ({
                ...prev, 
                [activeTab]: !prev[activeTab]
              }))}
              variant="outline" 
              className="font-mono text-xs gap-1 mr-2"
              aria-label="Cambiar entre versión normal y minificada"
            >
              {minified[activeTab] ? 'Ver normal' : 'Ver minificado'}
            </Button>
            <Button
              onClick={() => handleCopy(finalCode, activeTab.toUpperCase())}
              variant="secondary"
              className="font-mono text-xs gap-1"
              aria-label="Copiar código"
            >
              {copySuccess ? (
                <><Check className="h-3 w-3" /> Copiado</>
              ) : (
                <><Clipboard className="h-3 w-3" /> Copiar {activeTab.toUpperCase()}</>
              )}
            </Button>
            <Button
              onClick={() => handleDownload(
                finalCode,
                activeTab === 'svg' ? 'vector.svg' : activeTab === 'js' ? 'vector-animation.js' : 'VectorFramer.tsx'
              )}
              variant="outline"
              className="font-mono text-xs gap-1"
              aria-label="Descargar código"
            >
              <Download className="h-3 w-3" /> Descargar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
