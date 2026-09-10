import type { ReactNode } from 'react';

type Metric={label:string;value:string;detail?:string};
type LinkItem={href:string;label:string};

export function DecisionIntentPage({eyebrow,title,dek,decision,metrics,children,links}: {eyebrow:string;title:string;dek:string;decision:string;metrics:Metric[];children:ReactNode;links:LinkItem[]}){
  return <main style={{minHeight:'100vh',background:'#f4f1e8',color:'#173a32',fontFamily:'Georgia, Times New Roman, serif'}}>
    <section style={{padding:'72px 22px 48px',background:'linear-gradient(180deg,#dfe9df 0%,#f4f1e8 100%)'}}>
      <div style={{maxWidth:1040,margin:'0 auto'}}>
        <a href="/national-tools/grand-coulee/" style={{fontFamily:'Arial,sans-serif',fontSize:13,fontWeight:700,color:'#315c51',textDecoration:'none'}}>← Grand Coulee Live</a>
        <div style={{fontFamily:'Arial,sans-serif',fontSize:12,fontWeight:800,letterSpacing:'.13em',textTransform:'uppercase',marginTop:34,color:'#527167'}}>{eyebrow}</div>
        <h1 style={{fontSize:'clamp(42px,7vw,78px)',lineHeight:.98,letterSpacing:'-.035em',maxWidth:900,margin:'12px 0 18px'}}>{title}</h1>
        <p style={{fontFamily:'Arial,sans-serif',fontSize:'clamp(18px,2.2vw,24px)',lineHeight:1.5,maxWidth:820,color:'#405d55'}}>{dek}</p>
        <div style={{marginTop:28,padding:'20px 22px',background:'#173a32',color:'#fff',borderRadius:14,fontFamily:'Arial,sans-serif',fontSize:18,lineHeight:1.45}}><strong>Right now:</strong> {decision}</div>
      </div>
    </section>
    <section style={{padding:'28px 22px'}}><div style={{maxWidth:1040,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14}}>
      {metrics.map((m,i)=><article key={i} style={{background:'#fff',border:'1px solid #ddd7c9',borderRadius:12,padding:20}}><div style={{fontFamily:'Arial,sans-serif',fontSize:11,fontWeight:800,letterSpacing:'.09em',textTransform:'uppercase',color:'#62776f'}}>{m.label}</div><div style={{fontSize:28,fontWeight:700,marginTop:8}}>{m.value}</div>{m.detail&&<div style={{fontFamily:'Arial,sans-serif',fontSize:13,lineHeight:1.4,color:'#607069',marginTop:6}}>{m.detail}</div>}</article>)}
    </div></section>
    <section style={{padding:'18px 22px 56px'}}><div style={{maxWidth:1040,margin:'0 auto',background:'#fff',border:'1px solid #ddd7c9',borderRadius:14,padding:'clamp(22px,4vw,40px)',fontFamily:'Arial,sans-serif',fontSize:16,lineHeight:1.65,color:'#334d46'}}>{children}</div></section>
    <section style={{padding:'0 22px 70px'}}><div style={{maxWidth:1040,margin:'0 auto',borderTop:'1px solid #d6d0c3',paddingTop:24,fontFamily:'Arial,sans-serif'}}><strong style={{display:'block',marginBottom:12}}>More Grand Coulee decisions</strong><div style={{display:'flex',gap:18,flexWrap:'wrap'}}>{links.map(x=><a key={x.href} href={x.href} style={{color:'#1d5f50',fontWeight:700}}>{x.label}</a>)}</div></div></section>
  </main>;
}
