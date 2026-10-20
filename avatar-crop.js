/* AFTERLOGUE — portrait framing.
   All cropping happens locally in the browser; only the resulting square image is uploaded.
*/
(()=>{
'use strict';
window.AfterlogueCropPhoto=function(file){
 return new Promise((resolve,reject)=>{
  const dialog=document.getElementById('photo-crop-dialog');
  const canvas=document.getElementById('photo-crop-canvas');
  const zoomInput=document.getElementById('photo-crop-zoom');
  const apply=document.getElementById('photo-crop-apply');
  const cancel=document.getElementById('photo-crop-cancel');
  if(!dialog||!canvas||!dialog.showModal){reject(Error('Photo cropper is unavailable. Please refresh.'));return;}
  const image=new Image();
  const url=URL.createObjectURL(file);
  let zoom=1,dx=0,dy=0,drag=null,ended=false;
  const listeners=[];
  const on=(el,type,fn)=>{el.addEventListener(type,fn);listeners.push([el,type,fn]);};
  function stop(value,error){
   if(ended)return;
   ended=true;
   for(const [el,type,fn] of listeners)el.removeEventListener(type,fn);
   if(dialog.open)dialog.close();
   image.onload=null;image.onerror=null;
   URL.revokeObjectURL(url);
   apply.disabled=false;
   if(error)reject(error);else resolve(value);
  }
  function metrics(){
   const w=image.naturalWidth,h=image.naturalHeight;
   const scale=Math.max(300/w,300/h)*zoom;
   return {w:w*scale,h:h*scale,maxX:(w*scale-300)/2,maxY:(h*scale-300)/2};
  }
  function clamp(){
   const m=metrics();
   dx=Math.max(-m.maxX,Math.min(m.maxX,dx));
   dy=Math.max(-m.maxY,Math.min(m.maxY,dy));
  }
  function draw(output){
   if(!image.naturalWidth)return;
   clamp();
   const edge=output.width, factor=edge/300;
   const m=metrics();
   const ctx=output.getContext('2d');
   ctx.clearRect(0,0,output.width,output.height);
   ctx.imageSmoothingEnabled=true;
   ctx.imageSmoothingQuality='high';
   ctx.drawImage(image,(300-m.w)/2*factor+dx*factor,(300-m.h)/2*factor+dy*factor,m.w*factor,m.h*factor);
  }
  on(cancel,'click',()=>stop(null));
  on(dialog,'cancel',event=>{event.preventDefault();stop(null);});
  on(dialog,'close',()=>stop(null));
  on(zoomInput,'input',()=>{zoom=Number(zoomInput.value)||1;draw(canvas);});
  on(canvas,'pointerdown',event=>{
   if(event.button!==0&&event.pointerType!=='touch')return;
   drag={x:event.clientX,y:event.clientY,id:event.pointerId};
   canvas.setPointerCapture(event.pointerId);
  });
  on(canvas,'pointermove',event=>{
   if(!drag||event.pointerId!==drag.id)return;
   const rect=canvas.getBoundingClientRect();
   dx+=(event.clientX-drag.x)*300/rect.width;
   dy+=(event.clientY-drag.y)*300/rect.height;
   drag.x=event.clientX;drag.y=event.clientY;
   draw(canvas);
  });
  on(canvas,'pointerup',()=>{drag=null;});
  on(canvas,'pointercancel',()=>{drag=null;});
  on(canvas,'keydown',event=>{
   const changes={ArrowLeft:[-9,0],ArrowRight:[9,0],ArrowUp:[0,-9],ArrowDown:[0,9]};
   if(!changes[event.key])return;
   event.preventDefault();
   const [x,y]=changes[event.key];dx+=x;dy+=y;draw(canvas);
  });
  on(apply,'click',async()=>{
   try{
    apply.disabled=true;
    const output=document.createElement('canvas');
    output.width=512;output.height=512;
    draw(output);
    const blob=await new Promise(done=>output.toBlob(done,'image/jpeg',0.92));
    if(!blob)throw Error('Could not crop this image. Please select another photo.');
    const cropped=new File([blob],'afterlogue-profile.jpg',{type:'image/jpeg',lastModified:Date.now()});
    stop(cropped);
   }catch(error){stop(null,error);}
  });
  zoomInput.value='1';apply.disabled=true;
  dialog.showModal();
  image.onload=()=>{
   if(ended)return;
   if(!image.naturalWidth||!image.naturalHeight){stop(null,Error('Could not read the selected image.'));return;}
   zoom=1;dx=0;dy=0;apply.disabled=false;draw(canvas);
  };
  image.onerror=()=>stop(null,Error('This image format could not be opened. Try a JPEG or PNG.'));
  image.src=url;
 });
};
})();