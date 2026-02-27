import fs from 'fs';
import path from 'path';

function fixImportsInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixImportsInDir(fullPath);
        } else if (fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Regex para achar import ... from "./algo" ou "../algo"
            // Troca por "./algo.js" ou "../algo.js" (se já não tiver)
            const newContent = content.replace(/from\s+['"](\.\/|\.\.\/)([^'"]+?(?<!\.js))['"]/g, 'from \'$1$2.js\'');

            if (content !== newContent) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Corrigido: ${fullPath}`);
            }
        }
    }
}

fixImportsInDir(path.join(process.cwd(), 'server'));
fixImportsInDir(path.join(process.cwd(), 'api'));
console.log('Finalizado!');
