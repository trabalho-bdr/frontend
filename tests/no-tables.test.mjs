import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]);}
test('all site views use visualizations or records instead of HTML tables',()=>{
 // Q9 explicitly requires a comparison table for two elections.
 const violations=[...files('src'),...files('integrations')].filter(file=>/\.(jsx|tsx)$/.test(file)).filter(file=>!file.endsWith('PublicityComparison.jsx')).filter(file=>/<\/?(?:table|thead|tbody|tr|th|td)\b/.test(readFileSync(file,'utf8')));
 assert.deepEqual(violations,[]);
});
