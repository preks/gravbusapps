
export const HeroBanner = () => {
  return (
    <div className="gba:relative gba:h-40 gba:bg-gradient-to-r gba:from-rose-400 gba:via-violet-400 gba:to-sky-400 gba:overflow-hidden">
      <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xl gba:font-bold">
        Absence Management Dashboard (Backoffice)
      </div>
      <div className="gba:absolute gba:inset-0 gba:opacity-30">
        <div className="gba:absolute gba:top-10 gba:left-10 gba:w-28 gba:h-28 gba:rounded-full gba:bg-sky-300"></div>
        <div className="gba:absolute gba:top-16 gba:left-40 gba:w-14 gba:h-14 gba:rounded-full gba:bg-rose-300"></div>
        <div className="gba:absolute gba:bottom-5 gba:right-20 gba:w-20 gba:h-20 gba:rounded-full gba:bg-violet-300"></div>
        <div className="gba:absolute gba:top-5 gba:right-40 gba:w-16 gba:h-16 gba:rounded-full gba:bg-amber-300"></div>
      </div>
    </div>
  )
}
