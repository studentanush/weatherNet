import React from 'react'
import { FiSun } from "react-icons/fi"
import { motion } from 'framer-motion'
const Navbar = () => {
    return (
        <navbar className='absolute w-full z-50 transition-all duration-300'>
            <div

                className='container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20'>

                {/* Logo/Name*/}
                <motion.div
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 25,
                        dealy: 0.4,
                        duration: 1.2,

                    }}
                    className='flex items-center'>

                    <FiSun className='h-10 w-10 rounded-xl
                 flex items-center justify-center text-orange-500 font-bold text-xl mr-3'>
                        A
                    </FiSun>
                    <span className='text-xl font-bold bg-gradient-to-r from-gray-600 to-gray-400 
                bg-clip-text text-transparent'>
                        SolPredict
                    </span>

                </motion.div>
                {/* Desktop Navigation*/}
                <nav className='lg:flex hidden space-x-8'>
                    <motion.a
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 20,
                            delay: 0.7 + 0 * 0.2,
                        }}
                        href='#'

                        className='relative text-gray-800  hover:violet-600 dark:hover:text-orange-400 
                font-medium transition-colors duration-300 group'

                    >
                        Home
                        <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-orange-600 group-hover:w-full transition-all duration-300'></span>
                    </motion.a>
                    <motion.a
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 20,
                            delay: 0.7 + 1 * 0.2,
                        }}
                        href='predict'

                        className='relative text-gray-800  hover:violet-600 dark:hover:text-orange-400 
                font-medium transition-colors duration-300 group'
                       
                    >
                        Predict
                        <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-orange-600 group-hover:w-full transition-all duration-300'></span>
                    </motion.a>
                    <motion.a
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 20,
                            delay: 0.7 + 2 * 0.2,
                        }}
                        href='#'

                        className='relative text-gray-800  hover:violet-600 dark:hover:text-orange-400 
                font-medium transition-colors duration-300 group'
                        
                    >
                        About
                        <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-orange-600 group-hover:w-full transition-all duration-300'></span>
                    </motion.a>





                </nav>

            </div>

        </navbar>
    )
}

export default Navbar
