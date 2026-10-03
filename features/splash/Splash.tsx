/* Opening moment: a strand of hair draws itself into the brand's curl mark,
   the name rises, then the curtain lifts onto the store. Pure CSS, rendered
   on the server so it is there from the first frame; shown once per visit. */
const MARK = "M14 40c-1-10 0-20 3-26 2.500-5 7-8 12-7 5.500 1 8 6 6 10.500-2 4.500-7.500 6-11.500 4-3-1.500-3-5.500.500-6 3-.400 4.500 2.500 6.500 6 2.500 4.500 4 10 6.500 18";
const ONCE = "try{if(sessionStorage.getItem('rb_splash')){document.documentElement.classList.add('no-splash')}else{sessionStorage.setItem('rb_splash','1')}}catch(e){}";

export function Splash({ nameAr, name }: { nameAr: string; name: string }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE }} />
      <div className="splash" aria-hidden="true">
        <div className="splash-in">
          <svg viewBox="0 0 48 48" className="splash-mark">
            <defs>
              <linearGradient id="splash-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffd3e6" />
                <stop offset=".55" stopColor="#ff9ccb" />
                <stop offset="1" stopColor="#f2c98a" />
              </linearGradient>
            </defs>
            <path className="splash-strand" d={MARK} pathLength={1} />
            <path className="splash-sheen" d={MARK} pathLength={1} />
          </svg>
          <div className="splash-name">
            <b>{nameAr}</b>
            <span>{name}</span>
          </div>
        </div>
      </div>
    </>
  );
}
