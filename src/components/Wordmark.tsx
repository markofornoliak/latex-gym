export function Wordmark({stacked=false,className=''}:{stacked?:boolean;className?:string}) {
  return <div className={`wordmark ${stacked?'wordmark--stacked':''} ${className}`} aria-label="LaTeX gym">
    <span className="latex-mark"><span>L</span><span className="latex-a">A</span><span>T</span><span className="latex-e">E</span><span>X</span></span>
    <span className="gym-mark">gym</span>
  </div>;
}
