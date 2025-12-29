{
  const sectionId = document.currentScript.dataset.sectionId;
  const counters = document.querySelectorAll(`#counter-${sectionId} .countervalue__main-value`);

  for (let i = 0; i < counters.length; i++) {
    const counter = counters[i];

    const initialValue = parseFloat(counter.dataset.initial);
    const finalValue = parseFloat(counter.dataset.final);
    const duration = parseFloat(counter.dataset.duration);

    counter.textContent = finalValue.toFixed(0);
    gsap.from(`#${counter.id}`, {
      textContent: initialValue,
      duration: duration,
      ease: Power1.power1out,
      snap: { textContent: 1 },
      stagger: {
        each: 0,
        start: "start",
      },
      scrollTrigger: {
        trigger: counter,
        start: "top bottom-=100",
      },
    });
  }

  function decimalStrFromNumber(num) {
    const fraction = num.toString().split(".");
    return fraction.length >= 2 ? fraction[1] : undefined;
  }
}
