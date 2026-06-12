// landing4-app.jsx — composition + tweaks wiring for Landing v4.
(function () {
  const {
    Nav4, Hero4, Chains4, Agent4, Defense4, Console4, Footer4,
    useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakColor,
    startAurora4,
  } = window;

  function App() {
    const [tweaks, setTweak] = useTweaks({
      accent: '#4d84ff',
      motion: 120,      // percent
      waves: true,
    });

    // apply accent to CSS var
    React.useEffect(() => {
      document.documentElement.style.setProperty('--accent', tweaks.accent);
    }, [tweaks.accent]);

    // drive the background canvas (restarts cleanly when tweaks change)
    React.useEffect(() => {
      startAurora4({ motion: tweaks.motion / 100, accent: tweaks.accent, waves: tweaks.waves });
    }, [tweaks.motion, tweaks.accent, tweaks.waves]);

    // trigger hero word-mask reveal
    React.useEffect(() => {
      const t = setTimeout(() => document.body.classList.add('loaded'), 120);
      return () => clearTimeout(t);
    }, []);

    return (
      <>
        <Nav4></Nav4>
        <main data-screen-label="Landing v4">
          <Hero4></Hero4>
          <Chains4></Chains4>
          <Agent4></Agent4>
          <Defense4></Defense4>
          <Console4></Console4>
        </main>
        <Footer4></Footer4>
        <TweaksPanel title="Tweaks">
          <TweakSection label="Look">
            <TweakColor label="Accent" value={tweaks.accent}
              options={['#4d84ff', '#22d3ee', '#8b5cf6', '#34d399']}
              onChange={(v) => setTweak('accent', v)}></TweakColor>
          </TweakSection>
          <TweakSection label="Motion">
            <TweakSlider label="Background motion" value={tweaks.motion} min={0} max={250} step={10} unit="%"
              onChange={(v) => setTweak('motion', v)}></TweakSlider>
            <TweakToggle label="Wave lines" value={tweaks.waves}
              onChange={(v) => setTweak('waves', v)}></TweakToggle>
          </TweakSection>
        </TweaksPanel>
      </>
    );
  }

  // responsive: stack the agent grid on narrow screens
  const mq = document.createElement('style');
  mq.textContent = `
    @media (max-width: 860px) {
      [data-agent-grid] { grid-template-columns: minmax(0,1fr) !important; gap: 40px !important; }
      .navlinks { display: none !important; }
      .hide-sm { display: none !important; }
    }
  `;
  document.head.appendChild(mq);

  ReactDOM.createRoot(document.getElementById('app')).render(<App></App>);
})();
