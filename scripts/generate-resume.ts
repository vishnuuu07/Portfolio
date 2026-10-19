import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { profile as p, resumeBeatSummaries } from "../lib/profile";

const doc = await PDFDocument.create();
doc.setTitle(`${p.name} - Software Engineer Resume`); doc.setAuthor(p.name); doc.setSubject("Professional experience, education, research and working approach");
const regular = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const mono = await doc.embedFont(StandardFonts.Courier);
const ink = rgb(.169,.027,.067), muted = rgb(.34,.27,.29), coral = rgb(.86,.27,.19);
const W=595.28,H=841.89,M=42,width=W-M*2;
let page = doc.addPage([W,H]), y=H-M;
const clean = (text: string) => text.replace(/[—–]/g," - ").replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/↗|↑|↓/g,"").replace(/·/g," | ").replace(/\u2011/g,"-");
function newPage() { page=doc.addPage([W,H]);y=H-M;page.drawText(p.name.toUpperCase(),{x:M,y,size:8,font:mono,color:muted});y-=31; }
function ensure(height: number) { if(y-height<53)newPage(); }
function text(value: string, size=10, font=regular, color=ink, gap=5) {
  const words=clean(value).split(/\s+/);let line="";const lines:string[]=[];
  for(const word of words){const trial=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(trial,size)>width&&line){lines.push(line);line=word;}else line=trial;}if(line)lines.push(line);
  ensure(lines.length*(size*1.3)+gap);
  for(const item of lines){page.drawText(item,{x:M,y,size,font,color});y-=size*1.3;}y-=gap;
}
function heading(value:string){ensure(60);y-=7;page.drawLine({start:{x:M,y:y+8},end:{x:W-M,y:y+8},thickness:.5,color:rgb(.7,.63,.64)});text(value.toUpperCase(),9,bold,coral,9);}
function link(label:string,url:string){ensure(25);const size=9;const labelClean=clean(label);page.drawText(labelClean,{x:M,y,size,font:regular,color:ink});const length=Math.min(width,regular.widthOfTextAtSize(labelClean,size));page.drawLine({start:{x:M,y:y-2},end:{x:M+length,y:y-2},thickness:.4,color:ink});const annotation=doc.context.obj({Type:"Annot",Subtype:"Link",Rect:[M,y-3,M+length,y+11],Border:[0,0,0],A:{Type:PDFName.of("Action"),S:PDFName.of("URI"),URI:PDFString.of(url)}});const annots=page.node.Annots();if(annots)annots.push(doc.context.register(annotation));else page.node.set(PDFName.of("Annots"),doc.context.obj([doc.context.register(annotation)]));y-=23;}
text(p.name,29,bold,ink,5);text(`${p.role} | ${p.location}`,12,regular,muted,9);link(p.email,`mailto:${p.email}`);link("linkedin.com/in/vishnu-ch-58811416a",p.linkedin);
heading("Professional summary");text(p.summary,10);
heading("Enterprise experience");text(`${p.employment.employer} | ${p.employment.title}`,13,bold);text(p.employment.dates,9,mono,muted);text(p.employment.summary,10);
for(const [index,beat] of p.employment.beats.entries()){ensure(105);text(beat.title,11,bold,ink,6);text(resumeBeatSummaries[index],10);for(const bullet of beat.bullets)text(`- ${bullet}`,9.5,regular,ink,3);text(beat.technologies,8.5,regular,muted,10);}
heading("Published research");text(p.research.publication,12,bold);text(p.research.metadata,9,mono,muted);text(p.research.body,10);link(p.research.url,p.research.url);
heading("Freelance work");text(p.freelance.project,13,bold);text(p.freelance.metadata,9,regular,muted);text(p.freelance.body,10);for(const bullet of p.freelance.bullets)text(`- ${bullet}`,9.5,regular,ink,3);text(p.freelance.technologies,8.5,regular,muted,11);
heading("Education");text(p.education.degree,12,bold);text(`${p.education.institution} | ${p.education.dates} | CGPA ${p.education.cgpa}`,10);
heading("Credentials");for(const c of p.credentials){ensure(92);text(c.title,11,bold);text(c.description,10);text(`Earned ${c.earned} | Valid through ${c.validThrough}`,9,regular,muted);link("View credential",c.url);}
heading("Working approach");text(p.approach.lead,10);text(p.approach.body,10);text("Explore | Structure | Direct | Verify",9,mono,muted);
const pages=doc.getPages();pages.forEach((item,index)=>{item.drawLine({start:{x:M,y:40},end:{x:W-M,y:40},thickness:.4,color:rgb(.75,.68,.69)});item.drawText(`${p.name} | ${p.email}`,{x:M,y:26,size:7,font:regular,color:muted});item.drawText(`${index+1} / ${pages.length}`,{x:W-M-25,y:26,size:7,font:mono,color:muted});});
await mkdir("public/resume",{recursive:true});await writeFile("public/resume/vishnu-chittampalli.pdf",await doc.save());console.log(`Generated ${pages.length}-page resume PDF from lib/profile.ts`);
