// harness.js - a tiny fake browser so the app files can run under plain Node, and in a browser.
//
// Every global is set through `root` below rather than `global` or `window`. Node calls its global
// object `global`, a browser calls it `globalThis` and may not define `global` at all: writing
// `global.document=...` throws a ReferenceError in a browser, which silently kills the whole file.
var root = (typeof globalThis !== 'undefined') ? globalThis
         : (typeof global !== 'undefined') ? global
         : (typeof window !== 'undefined') ? window : this;

const el=()=>({style:{setProperty(){}},setAttribute(){},getAttribute(){return null},before(){},prepend(){},insertBefore(){},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},append(){},after(){},remove(){},querySelectorAll(){return []},querySelector(){return el()},insertAdjacentHTML(){},addEventListener(){},options:[],innerHTML:'',appendChild(){},value:'',focus(){},click(){}});
// A throwaway store, never the real one. In a browser the page's own localStorage would otherwise
// hold real saved data, and the tests below call save() and load() against it.
const mem={};
function memStore(){return{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}}}
try{root.localStorage=memStore()}catch(e){Object.defineProperty(root,'localStorage',{value:memStore(),configurable:true})}
root.document={hidden:false,getElementById:()=>el(),querySelector:q=>q==='#app'?Object.assign(el(),{style:{setProperty(){}}}):el(),querySelectorAll:()=>[],createElement:()=>el(),addEventListener(){},documentElement:{setAttribute(){},removeAttribute(){}}};
root.window={addEventListener(){},print(){}};root.location={reload(){}};root.navigator={};root.MutationObserver=class{observe(){}};root.performance={now:()=>0};root.requestAnimationFrame=()=>{};root.Option=function(a,b){return{text:a,value:b}};root.Event=function(){};
root.window.document=root.document;root.window.location=root.location;root.window.navigator=root.navigator;

// ---- collecting results -------------------------------------------------------------------------
// The point of these helpers is that a failure must say WHAT WAS ACTUALLY SEEN. "FAIL cash restored"
// on its own costs another whole run to investigate; "FAIL cash restored -> -250" does not.
root.outs=[];
root.passed=0;
root.noted=0;

function tidy(v){
  if (typeof v === 'string') return v.length > 70 ? v.slice(0, 70) + '…' : v;
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'object'){
    try { var s = JSON.stringify(v); return s && s.length > 90 ? s.slice(0, 90) + '…' : String(s) }
    catch (e) { return '[object]' }
  }
  return String(v);
}

// chk(name, text): the text is screen output, so it is checked for the shapes that mean a bug.
root.chk=(n,h)=>{
  if(typeof h!=='string'){outs.push('NOT TEXT '+n);return}
  const x=h.replace(/===undefined/g,'');
  if(/\$\{|undefined|NaN|\[object|Infinity/.test(x)){
    outs.push('BAD OUTPUT '+n+': '+(x.match(/.{0,60}(\$\{|undefined|NaN|\[object|Infinity).{0,40}/)||[''])[0]);
  } else passed++;
};

// T(name, condition): a plain assertion.
root.T=(n,c)=>{
  if(c){passed++;return}
  outs.push('FAIL '+n);
};

// eq(name, actual, expected): an assertion that reports both numbers when it fails.
root.eq=(n,a,b)=>{
  if(a===b){passed++;return}
  outs.push('FAIL '+n+'  ->  got '+tidy(a)+', wanted '+tidy(b));
};

// note(label, value): record a value so a later failure can be read without another run.
root.note=(l,v)=>{
  noted++;
  outs.push('NOTE '+l+' = '+tidy(v));
};
