const fs = require('fs');
const path = require('path');

// Ruta al archivo ExportDialog.tsx
const filePath = path.join('/Users/gsus/CascadeProjects/Vector/vector-next/src/components/vector/ExportDialog.tsx');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf8');

// Dividir el contenido en líneas para facilitar el manejo
const lines = content.split('\n');

// Corregir la línea 93 (índice 92): Eliminar calculatedGridCols de las dependencias
if (lines[92].includes('calculatedGridCols')) {
  lines[92] = lines[92].replace(', calculatedGridCols', '');
  console.log('Corregida dependencia innecesaria en línea 93');
}

// Corregir la línea 301 (índice 300): Eliminar svgLines de las dependencias
if (lines.length > 300 && lines[300].includes('svgLines')) {
  lines[300] = lines[300].replace(', svgLines', '');
  console.log('Corregida dependencia innecesaria en línea 301');
}

// Corregir la línea 321 (índice 320): Añadir svgLines.length a las dependencias
if (lines.length > 320) {
  // Buscar el array de dependencias
  const match = lines[320].match(/\[(.*?)\]/);
  if (match) {
    const deps = match[1].trim();
    // Si ya tiene dependencias, añadir svgLines.length con una coma
    if (deps) {
      lines[320] = lines[320].replace(/\[(.*?)\]/, `[$1, svgLines.length]`);
    } else {
      // Si no tiene dependencias, añadir svgLines.length sin coma
      lines[320] = lines[320].replace(/\[\]/, `[svgLines.length]`);
    }
    console.log('Añadida dependencia faltante en línea 321');
  }
}

// Unir las líneas de nuevo en un solo string
content = lines.join('\n');

// Escribir el contenido modificado de vuelta al archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('Correcciones aplicadas con éxito');
