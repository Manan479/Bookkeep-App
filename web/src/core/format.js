// core/format.js - Money, date and number formatting helpers. No screen code.
const fmt=n=>S.cur+Math.round(n).toLocaleString('en-US');
const tdy=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
const fmtD=iso=>iso?new Date(iso+'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Select date';
const fmtS=iso=>new Date(iso+'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const plus=(iso,n)=>{const d=new Date(iso+'T00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const pad4=n=>String(n).padStart(4,'0'),RL={c:'Customer',s:'Supplier',d:'Distributor'};
const num=(k,n)=>NUMP[k]+pad4(n);
const ini2=n=>n.split(' ').map(w=>w[0]).join('').slice(0,2);
