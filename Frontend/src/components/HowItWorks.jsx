import React, { useEffect, useRef } from 'react'
import { gsap } from "gsap/gsap-core"
import { ScrollTrigger } from "gsap/all";
const HowItWorks = () => {
    const titleRef = useRef(null);
    const sectionRef = useRef(null);
    const introRef = useRef(null);
    const starRef  = useRef([]);
    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        //Title animation
        gsap.fromTo(
            titleRef.current,
            { y: 100, opacity: 0 },
            {
                y: -200,
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
            { y: 100, opacity: 0, filter: "blur(10px)" },
            {
                y: -150,
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
        starRef.current.forEach((star,index) => {
            const direction = index%2===0?1:-1
            const speed = 0.5 + Math.random()*0.5
            gsap.to(star,{
                x:`${direction * (100+index*20)}`,
                y:`${direction * -50-index*10}`,
                rotation: direction*360,
                ease:"none",
                scrollTrigger:{
                    trigger:sectionRef.current,
                    start:"top bottom",
                    end:"bottom top",
                    scrub:speed,
                }

            })
        })
        return ()=>{
            ScrollTrigger.getAll().forEach((trigger)=>{
                if(trigger.vars.trigger === sectionRef.current){
                    trigger.kill()
                }
            })
        }

    }, [])
    const addToStars = (el)=>{
        if(el && !starRef.current.includes(el)){
            starRef.current.push(el)
        }
    }
    return (
        <section ref={sectionRef} className="h-screen relative overflow-hidden
        bg-gradient-to-b from-yellow-300 via-blue-400 to-blue-700
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
                            background: "blue",
                            opacity: 0.2 + Math.random() * 0.4,
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>
            <div className="container mx-auto px-4 h-full
            flex flex-col items-center justify-center">
                <h1 ref={titleRef} className="text-4xl md:text-6xl font-extrabold 
                sm:mb-16 text-center text-black shadow-lg shadow-black/30
                     uppercase tracking-wider font-serif
 opacity-0">
                    How it Works
                </h1>
            </div>
            <div ref={introRef} className="absolute  bottom-[-5rem] left-0 w-full flex 
             justify-between  items-center opacity-0">
                <img className="h-[23rem] 
                mix-blend-lighten" src="src/assets/analyze.svg" alt="" />
                <div className='flex flex-col items-center px-10'>
                    <h3 className="text-sm md:text-2xl font-extrabold
                text-slate-700 z-50 lg:max-w-[35rem] max-w-
                [27rem] tracking-wider md:mt-16 sm:mt-[-40rem] mt-[-32rem] hover:underline ">
                    <h4> Step 1 : Enter Location </h4>
                   
                        
                    </h3>
                    <h3 className="text-sm md:text-2xl font-extrabold 
                text-slate-700 z-50 lg:max-w-[35rem] max-w-
                [27rem] tracking-wider md:mt-13 sm:mt-[-40rem] mt-[-32rem] hover:underline">
                    <h4>Step 2 : AI Model Predicts</h4>
                    
                    </h3>
                    <h3 className="text-sm md:text-2xl font-extrabold 
                text-slate-700 z-50 lg:max-w-[35rem] max-w-
                [27rem] tracking-wider md:mt-13 sm:mt-[-40rem] mt-[-32rem] hover:underline ">
                    <h4> Step 3 : Get Solar Output </h4>
                    
                    </h3>
                </div>

                <img className="h-[23rem] 
                mix-blend-lighten" src="src/assets/location.svg" alt="" />
            </div>

        </section>
    )
}

export default HowItWorks
