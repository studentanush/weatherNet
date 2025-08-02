
import { motion } from "framer-motion"
import Spline from "@splinetool/react-spline";
import { useNavigate } from "react-router-dom";
const HeroSection = () => {
    

    const navigate = useNavigate();
    return (
        <section className="h-screen bg-gradient-to-b from-white via-yellow-100 to-yellow-300
          flex xl:flex-row
    flex-col-reverse items-center justify-between
    lg:px-24 px-10 relative overflow-hidden 
    ">
            {/* Left section */}
            <div className="z-40 xl:mb-0 mb-[20%]">
                <motion.h1
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 40,
                        damping: 25,
                        delay: 1.3,
                        duration: 1.5
                    }}
                    className="text-5xl md:text-7xl lg:text-7xl
            font-bold  z-10 mb-6">
                    Predict Solar Energy <br /> using AI
                    Results
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 40,
                        damping: 25,
                        delay: 1.8,
                        duration: 1.5
                    }}
                    className="text-xl md:text-1xl lg:text-2xl
             italic text-slate-600 
 max-w-2xl text-sm ">
                    "Enter your weather
                    data and get instant
                    solar power prediction"
                </motion.p>
                <motion.button
                initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{
                        type: "spring",
                        stiffness: 40,
                        damping: 25,
                        delay: 1.8,
                        duration: 1.5
                    }}
                className="px-6 py-2 mt-6 bg-[#f77913] hover:bg-yellow-500 border-1 border-amber-300 
                 text-white font-semibold rounded-2xl shadow-md transition duration-300 cursor-pointer"
                 onClick={()=>navigate("/predict")}
                >
                    Start Predicting

                </motion.button>
            </div>
            {/* Right Section */}

            <Spline className="absolute xl:right-[-28%] right-0 top-[-20%] lg:top-0"
                scene="https://prod.spline.design/N5cUmWtoDFggcTja/scene.splinecode" />




        </section>
    )
}

export default HeroSection
