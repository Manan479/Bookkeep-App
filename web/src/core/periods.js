// core/periods.js - Period ranges and date filtering. No screen code.
function prange(){const t=new Date(tdy+'T00:00'),y=t.getFullYear(),m=t.getMonth(),P=S.period,D=(yy,mm,dd)=>new Date(yy,mm,dd);let a,b;
if(P==='Today'){a=t;b=t}else if(P==='This Week'){const w=(t.getDay()+6)%7;a=D(y,m,t.getDate()-w);b=D(y,m,t.getDate()-w+6)}else if(P==='This Month'){a=D(y,m,1);b=D(y,m+1,0)}else if(P==='Last Month'){a=D(y,m-1,1);b=D(y,m,0)}else if(P==='This Quarter'){const q=Math.floor(m/3)*3;a=D(y,q,1);b=D(y,q+3,0)}else if(P==='This Year'){a=D(y,0,1);b=D(y,11,31)}else if(S.cr){a=new Date(S.cr[0]+'T00:00');b=new Date(S.cr[1]+'T00:00')}else{a=D(y,0,1);b=D(y,11,31)}
return[a.getTime(),b.getTime()+86399999]}
function inP(ds){const d=new Date(ds).getTime();if(isNaN(d))return true;const r=prange();return d>=r[0]&&d<=r[1]}
const live=r=>r[4]!=='Draft'&&r[4]!=='Void';

// The period the screens are showing, as two ISO dates, inclusive at both ends.
// prange() works in milliseconds because inP() compares timestamps, and the ledger compares date
// strings, so this is the bridge between the two: everything that reads the book by period uses it.
const isoOf=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function piso(){const r=prange();return[isoOf(new Date(r[0])),isoOf(new Date(r[1]))]}
// The window of the same length immediately before the one being shown, for the "compare previous"
// switch. The days are stepped back with setDate() rather than by subtracting milliseconds, so a
// daylight-saving change cannot land the window on the wrong day.
function pisoPrev(){const r=prange(),a=new Date(r[0]),b=new Date(r[1]),days=Math.round((b.getTime()-a.getTime())/864e5)+1;const pa=new Date(a),pb=new Date(b);pa.setDate(pa.getDate()-days);pb.setDate(pb.getDate()-days);return[isoOf(pa),isoOf(pb)]}
