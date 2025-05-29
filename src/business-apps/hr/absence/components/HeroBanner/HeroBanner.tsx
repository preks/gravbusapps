
export const HeroBanner = () => {
  return (
    <div className="relative h-40 bg-gradient-to-r from-rose-400 via-violet-400 to-sky-400 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold">
        Absence Management Dashboard
      </div>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-28 h-28 rounded-full bg-sky-300"></div>
        <div className="absolute top-16 left-40 w-14 h-14 rounded-full bg-rose-300"></div>
        <div className="absolute bottom-5 right-20 w-20 h-20 rounded-full bg-violet-300"></div>
        <div className="absolute top-5 right-40 w-16 h-16 rounded-full bg-amber-300"></div>
      </div>
    </div>
  )
}
