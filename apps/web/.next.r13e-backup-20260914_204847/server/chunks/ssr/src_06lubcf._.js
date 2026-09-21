module.exports=[48588,a=>{"use strict";a.s(["SessionRefresh",()=>b]);let b=(0,a.i(11857).registerClientReference)(function(){throw Error("Attempted to call SessionRefresh() from the server but SessionRefresh is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/src/components/auth/session-refresh.tsx","SessionRefresh")},80090,a=>{"use strict";var b=a.i(48588);a.n(b)},27572,a=>{"use strict";var b=a.i(7997),c=a.i(80090);let d=`
(function () {
  try {
    var saved = localStorage.getItem('engeradios-theme');
    var dark = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (_) {}
})();
`;a.s(["default",0,function({children:a}){return(0,b.jsxs)("html",{lang:"pt-BR",suppressHydrationWarning:!0,children:[(0,b.jsx)("head",{children:(0,b.jsx)("script",{dangerouslySetInnerHTML:{__html:d}})}),(0,b.jsxs)("body",{children:[(0,b.jsx)(c.SessionRefresh,{}),a]})]})},"metadata",0,{title:{default:"Gestão Engerádios 2.0",template:"%s | Gestão Engerádios 2.0"},description:"Portal corporativo integrado da Engerádios.",icons:{icon:"/brand/favicon.png",apple:"/brand/favicon.png"}}])},50645,function(a){a.n(a.i(27572))}];

//# sourceMappingURL=src_06lubcf._.js.map