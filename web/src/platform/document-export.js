// Preview, print and PDF all use the same paper HTML and its computed styles.
async function invoicePdfPages(d){
 const f=d.format||S.fmt||SET.fmt||'A4',host=document.createElement('div');
 host.className='pdf-render-host';host.style.cssText='position:absolute;left:-100000px;top:0;width:max-content;pointer-events:none;';
 host.setAttribute('aria-hidden','true');host.innerHTML=d.html||invPaper(d,f);document.body.appendChild(host);
 try{
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  const paper=host.querySelector('.paper');if(!paper)throw new Error('The document preview is not available.');
  paper.style.transform='none';paper.style.boxShadow='none';paper.style.margin='0';paper.style.position='relative';paper.style.left='0';paper.style.top='0';
  await Promise.all(Array.from(paper.querySelectorAll('img')).map(image=>image.complete?Promise.resolve():new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('The invoice logo could not be loaded.'))})));
  fitPage(paper);
  const pages=[];
  for(const sheet of paginateInvoicePaper(paper)){
  const paper=sheet;
  const width=Math.ceil(paper.getBoundingClientRect().width),height=Math.ceil(paper.getBoundingClientRect().height);
  const thermal=f==='80mm'||f==='58mm',pageHeight=thermal?height:f==='A5'?794:1123;
  // Capture at high resolution with the loaded fonts and the actual preview template.
  const rendered=await html2canvas(paper,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false,
    width,height,windowWidth:window.innerWidth,windowHeight:Math.max(window.innerHeight,height),scrollX:0,scrollY:0,
    ignoreElements:element=>element!==host&&element.classList&&element.classList.contains('pdf-render-host')});
  const origin=paper.getBoundingClientRect().top;
  const keepTogether=Array.from(paper.querySelectorAll('tr,.terms,[data-paper-footer]')).map(element=>{
   const rect=element.getBoundingClientRect();return {top:rect.top-origin,bottom:rect.bottom-origin};
  }).filter(rect=>rect.bottom-rect.top<pageHeight);
  let offset=0;
  while(offset<height){
   let end=Math.min(offset+pageHeight,height);
   if(!thermal&&end<height){
    const crossing=keepTogether.filter(rect=>rect.top>offset+1&&rect.top<end&&rect.bottom>end);
    if(crossing.length)end=Math.floor(Math.min(...crossing.map(rect=>rect.top)));
   }
   if(end<=offset)end=Math.min(offset+pageHeight,height);
   const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=pageHeight*2;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(rendered,0,offset*2,width*2,(end-offset)*2,0,0,width*2,(end-offset)*2);
   const dimensions=f==='A5'?[419.53,595.28]:f==='80mm'?[226.77,pageHeight*.75]:f==='58mm'?[164.41,pageHeight*.75]:[595.28,841.89];
   pages.push({image:canvas.toDataURL('image/png'),width:dimensions[0],height:dimensions[1]});offset=end;
  }
  }
  return pages;
 }finally{host.remove()}
}
async function makeInvoicePdf(documents){
 const pdf=await PDFLib.PDFDocument.create();pdf.setTitle(documents.length===1?documents[0].no:'Selected invoices');pdf.setProducer('Bookkeep');
 for(const d of documents)for(const frame of await invoicePdfPages(d)){
  const png=await pdf.embedPng(frame.image),page=pdf.addPage([frame.width,frame.height]);
  page.drawImage(png,{x:0,y:0,width:frame.width,height:frame.height});
 }
 return pdf.save();
}
function shareVisiblePaper(){
 const paper=document.querySelector('.paper');if(!paper){toast('Open the document preview first');return}
 const heading=document.querySelector('.pvhead h1');
 const no=S.screen==='prev'?pno():heading?heading.textContent:'Document';
 const wrapper=paper.closest('.paperwrap');
 documentActions([{no,html:wrapper&&wrapper._paperSource||paper.outerHTML,format:S.fmt||SET.fmt||'A4'}]);
}

async function prepareDocumentFiles(docs,mode){
  if(!docs.length)throw new Error('Nothing selected.');
  if(mode==='combined')return [{name:docs.length===1?fileName(docs[0].no)+'.pdf':'bookkeep-invoices-'+tdy+'.pdf',bytes:await makeInvoicePdf(docs),mime:'application/pdf'}];
  const files=[];
  for(const [index,d] of docs.entries())files.push({name:String(index+1).padStart(3,'0')+'-'+fileName(d.no)+'.pdf',bytes:await makeInvoicePdf([d]),mime:'application/pdf'});
  return files;
}

function bytesBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}

async function saveDocumentBytes(file){
  if(window.Saver&&window.Saver.saveBytes){
    const result=await window.Saver.saveBytes(file.name,bytesBase64(file.bytes),file.mime);
    if(result===false)throw new Error('Saving was cancelled or failed.');
    toast(result===undefined?'Choose where to save the file.':'File saved.');return;
  }
  const url=URL.createObjectURL(new Blob([file.bytes],{type:file.mime})),a=document.createElement('a');
  a.href=url;a.download=file.name;a.style.display='none';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},60000);toast('Download started.');
}

async function saveDocumentFiles(files,mode){
  if(mode!=='separate')return saveDocumentBytes(files[0]);
  const zip=new JSZip();files.forEach(f=>zip.file(f.name,f.bytes));
  return saveDocumentBytes({name:'bookkeep-invoices-'+tdy+'.zip',mime:'application/zip',bytes:await zip.generateAsync({type:'uint8array'})});
}

async function shareDocumentFiles(files){
  if(window.Sharer&&window.Sharer.shareFiles){
    window.Sharer.shareFiles(JSON.stringify(files.map(f=>({name:f.name,base64:bytesBase64(f.bytes),mime:f.mime}))));
    return 'Choose an app to share the PDF'+(files.length===1?'':'s')+'.';
  }
  if(typeof File!=='undefined'&&navigator.share&&navigator.canShare){
    const shared=files.map(f=>new File([f.bytes],f.name,{type:f.mime}));
    if(navigator.canShare({files:shared})){await navigator.share({files:shared,title:'Bookkeep invoices'});return 'Sharing finished.'}
  }
  return 'This browser cannot share files directly. Use Save PDF or Save ZIP, then attach the saved file in your email or messaging app.';
}
