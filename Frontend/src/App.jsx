import HomePage from "./pages/HomePage"
import {Routes,Route} from "react-router-dom"
import PredictionPage from "./pages/PredictionPage"

const App = () => {
  return (
    <>  
      
      <Routes>
          <Route path = "/" element = {<HomePage/>}/>
          <Route path = "/predict" element={<PredictionPage/>}/>
      </Routes>

    </>
  )
}

export default App
