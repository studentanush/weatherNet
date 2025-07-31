import React, { useEffect, useRef } from 'react'
import { gsap } from "gsap/gsap-core"
import { ScrollTrigger } from "gsap/all";
import HappySunGif from "../assets/happySun.gif";
import animationData from "../assets/solar.json";
import Lottie from "lottie-react";
import { FaReact, FaNodeJs, FaPython } from "react-icons/fa";
import { SiTailwindcss, SiMongodb } from "react-icons/si";
import { FaGithub } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FaGlobe } from "react-icons/fa";
const HowItWorks = () => {
    const titleRef = useRef(null);
    const sectionRef = useRef(null);
    const introRef = useRef(null);
    const starRef = useRef([]);
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        //Title animation
        gsap.fromTo(
            titleRef.current,
            { y: 100, opacity: 0 },
            {
                y: -5,
                opacity: 1,
                duration: 0.8,
                scrollTrigger: {
                    trigger: sectionRef.current,    // it will trigger when it is in the section section... wait what
                    start: "top 40%", // this tell the gsap when to trigger the animation relative to view port
                    toggleActions: "play none none reverse"// this will handle when scroll up or down

                }
            }
        )
        // Intro Animation
        gsap.fromTo(
            introRef.current,
            { y: 100, opacity: 0, filter: "blur(15px)" },
            {
                y: -10,
                opacity: 1,
                filter: "blur(0px)",
                duration: 1.5,
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top 40%",
                    toggleActions: "play none none reverse",

                }
            }
        )
        // Star Animation
        starRef.current.forEach((star, index) => {
            const direction = index % 2 === 0 ? 1 : -1
            const speed = 0.5 + Math.random() * 0.5
            gsap.to(star, {
                x: `${direction * (100 + index * 20)}`,
                y: `${direction * -50 - index * 10}`,
                rotation: direction * 360,
                ease: "none",
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: speed,
                }

            })
        })
        return () => {
            ScrollTrigger.getAll().forEach((trigger) => {
                if (trigger.vars.trigger === sectionRef.current) {
                    trigger.kill()
                }
            })
        }

    }, [])
    const addToStars = (el) => {
        if (el && !starRef.current.includes(el)) {
            starRef.current.push(el)
        }
    }
    return (
        <section ref={sectionRef} className="min-h-screen relative overflow-hidden
        bg-gradient-to-b from-yellow-100  to-white z-50 p-6
">
            {/* Stars */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(10)].map((_, i) => (
                    <div
                        ref={addToStars}
                        key={`star-${i}`}
                        className="absolute rounded-full"
                        style={{
                            width: `${10 + i * 3}px`,
                            height: `${10 + i * 3}px`,
                            background: "orange",
                            opacity: 0.2 + Math.random() * 0.4,
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto px-4 h-full 
                flex flex-col  items-center justify-center z-50">
                <h1 ref={titleRef} className="text-4xl md:text-5xl font-bold
                    sm:mb-16 text-center text-gray-800 opacity-0 flex items-center">
                    <img className='w-20 h-20' src={HappySunGif} alt="" />
                    SolarPredict
                </h1>
            </div>
            <div ref={introRef} className='flex justify-between items-center  mb-20'>
                <div className='flex flex-col items-center px-10'>
                    <h3 className=" md:text-3xl font-extrabold
                text-slate-700 z-50 lg:max-w-[35rem] max-w-
                [27rem] tracking-wider md:mt-16  mt-[-32rem] hover:underline ">
                        About Project
                    </h3>
                    <h4 className=" text-2xl font-extrabold 
                text-slate-700 z-50 lg:max-w-[35rem] max-w-
                [27rem] tracking-wider md:mt-13  mt-[-32rem] ">
                        SolarPredict is a lightweight tool that helps individuals and
                        communities forecast solar energy output using real-time weather   data and smart AI.
                        Our mission is to make solar planning easier, efficient, and eco-friendly.

                    </h4>
                    <div className="flex flex-col items-center mt-10 max-w-[35rem]">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            ⚙️ Built with:
                        </h3>

                        <div className="flex flex-wrap justify-center gap-6 items-center text-lg font-semibold text-gray-700">
                            <span className="flex items-center gap-2">
                                <FaReact className="text-blue-500 text-2xl" />
                                React
                            </span>

                            <span className="flex items-center gap-2">
                                <SiTailwindcss className="text-cyan-500 text-2xl" />
                                Tailwind
                            </span>

                            <span className="flex items-center gap-2">
                                <FaNodeJs className="text-green-600 text-2xl" />
                                Node.js
                            </span>

                            <span className="flex items-center gap-2">
                                <FaPython className="text-yellow-500 text-2xl" />
                                Python
                            </span>

                            <span className="flex items-center gap-2">
                                <SiMongodb className="text-green-700 text-2xl" />
                                MongoDB
                            </span>
                        </div>
                    </div>

                </div>
                <Lottie animationData={animationData} loop={true} className="w-200 h-100" />
            </div>

            <div  className="flex gap-8 text-gray-700 text-lg font-medium items-center justify-center mt-10">
                <a
                    href="https://github.com/your-username"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-black transition cursor-pointer"
                >
                    <FaGithub className="text-xl " />
                    GitHub
                </a>

                <a
                    href="mailto:your@email.com"
                    className="flex items-center gap-2 hover:text-black transition"
                >
                    <MdEmail className="text-xl" />
                    Contact
                </a>

                <a
                    href="https://yourwebsite.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-black transition"
                >
                    <FaGlobe className="text-xl" />
                    Website
                </a>
            </div>



        </section >
    )
}

export default HowItWorks
