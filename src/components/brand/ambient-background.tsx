export function AmbientWorkshopBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="ambient-light-amber bg-amber/[0.075] absolute -top-[24rem] -right-[24rem] size-[64rem] rounded-full blur-[160px] will-change-transform" />
      <div className="ambient-light-sage bg-sage/[0.05] absolute -bottom-[28rem] -left-[24rem] size-[66rem] rounded-full blur-[160px] will-change-transform" />
      <div className="ambient-checker absolute inset-0 opacity-60" />
      <div className="ambient-scan absolute inset-y-0 left-0 w-[42%] will-change-transform" />
      <span className="tech-node top-[18%] left-[12%]" />
      <span className="tech-node top-[31%] right-[18%]" />
      <span className="tech-node right-[37%] bottom-[23%]" />
      <span className="tech-node bottom-[14%] left-[27%]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(242,235,221,0.18)_0.55px,transparent_0.55px)] bg-[size:5px_5px] opacity-[0.025]" />
    </div>
  );
}
