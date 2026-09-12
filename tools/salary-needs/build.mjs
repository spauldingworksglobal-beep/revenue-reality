// Assembles the Webflow embed files and local preview pages.
// Run: node tools/salary-needs/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const dir = dirname(fileURLToPath(import.meta.url));
const dist = join(dir, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const css = readFileSync(join(dir, 'salary-needs.css'), 'utf8');
const html = readFileSync(join(dir, 'salary-needs.html'), 'utf8').trim();
const js = readFileSync(join(dir, 'salary-needs.js'), 'utf8');
const site = JSON.parse(readFileSync(join(dir, 'site-chrome.json'), 'utf8'));

const cssMin = css.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
const { code: jsMin } = await transform(js, { minify: true, target: 'es2017', legalComments: 'none', charset: 'utf8' });

const banner = (what) => `<!-- Salary Needs · ${what} · A tool by Spaulding Works. Source: tools/salary-needs in the revenue-reality repo. -->\n`;
const calcMarkup = banner('part 1 of 2: styles + markup') + '<style>\n' + cssMin + '\n</style>\n' + html + '\n';
const scriptEmbed = banner('part 2 of 2: script') + '<script>\n' + jsMin + '\n</script>\n';

// Site chrome, taken from the live Tools page embed: header + <main> opener, and </main> + footer.
const tools = site.toolsEmbed;
const mainOpen = "<main class='v2-main' id='v2-main'>";
const mainClose = '</main>';
const chromeTop = tools.slice(tools.indexOf("<div class='v2'>"), tools.indexOf(mainOpen) + mainOpen.length);
const chromeBottom = tools.slice(tools.lastIndexOf(mainClose));

// 1. The Salary Needs page: one embed with chrome + calculator, one embed with the script.
const pageEmbed = chromeTop.replace("<div class='v2'>", "<div class='v2 sn-page'>") + '\n' + calcMarkup + chromeBottom + '\n';
writeFileSync(join(dist, 'salary-needs-page-embed.html'), pageEmbed);
writeFileSync(join(dist, 'salary-needs-script-embed.html'), scriptEmbed);

// 2. The Tools page: original embed with the Salary Needs card linking to the new page.
const cardRe = /<span class='v2-tool-status'>Coming soon<\/span><h3>What Salary Do I Need\?<\/h3>([\s\S]*?)<a class='v2-tool-cta' href='\/contact'>Start a conversation <span class='v2-arrow' aria-hidden='true'>&#8594;<\/span><\/a>/;
if (!cardRe.test(tools)) throw new Error('Salary card not found in tools embed');
const toolsEmbed = tools.replace(cardRe, `<span class='v2-tool-status is-dev'>Try it now</span><h3>Salary Needs</h3><p>${site.salaryNeedsCardCopy}</p><a class='v2-tool-cta' href='${site.salaryNeedsPath}'>Open the calculator <span class='v2-arrow' aria-hidden='true'>&#8594;</span></a>`) + '\n';
writeFileSync(join(dist, 'tools-page-embed.html'), toolsEmbed);

// 3. Local previews. ?demo=1 seeds sample numbers into localStorage before the calculator boots; &spec=1 uses the spec check.
const demoSeed = `<script>
(function(){try{if(location.search.indexOf('demo=1')<0)return;var now={id:'s1',name:'My life now',cats:{housing:{on:true,items:[{id:'d1',name:'Rent or mortgage',amount:'3,200',freq:'monthly'}]},food:{on:true,items:[{id:'d2',name:'Groceries',amount:'150',freq:'weekly'},{id:'d3',name:'Eating out',amount:'',freq:'monthly'}]},savings:{on:true,items:[{id:'d4',name:'Emergency savings',amount:'350',freq:'monthly'}]}},order:['housing','food','savings'],goals:[{id:'d5',name:'Move',goal:'12,000',saved:'3,000',months:'18'}],support:{answered:'yes',sources:[{id:'d6',type:'partner',name:'',amount:'1,000',freq:'monthly'}]},copiedFrom:null,copiedAck:false};if(location.search.indexOf('spec=1')>=0){now.cats={housing:{on:true,items:[{id:'d1',name:'Rent or mortgage',amount:'5,000',freq:'monthly'}]}};now.order=['housing'];now.goals=[];}localStorage.setItem('sw-salary-needs-v2',JSON.stringify({v:2,scenarios:[now],active:'s1'}));}catch(e){}})();
</script>`;
const shell = (title, body) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<link href="https://cdn.prod.website-files.com/6a8c833357e0b26fd0830e78/css/spaulding-works.webflow.shared.4ce8480b0.css" rel="stylesheet">
${site.head}
</head><body>
${demoSeed}
${body}
${site.footer}
</body></html>`;
writeFileSync(join(dist, 'preview.html'), shell('Salary Needs — page preview', pageEmbed + scriptEmbed));
writeFileSync(join(dist, 'preview-tools.html'), shell('Tools — page preview', toolsEmbed));

const report = (name, s) => console.log(`${name.padEnd(34)} ${String(s.length).padStart(6)} chars ${s.length > 50000 ? ' ⚠ over Webflow 50,000 embed limit' : 'ok'}`);
report('salary-needs-page-embed.html', pageEmbed);
report('salary-needs-script-embed.html', scriptEmbed);
report('tools-page-embed.html', toolsEmbed);
