import {FilesetResolver,PoseLandmarker} from '@mediapipe/tasks-vision';
let detector;
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   const vision=await FilesetResolver.forVisionTasks(data.wasm);
   detector=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:data.model,delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
   self.postMessage({type:'ready'});
  }else if(data.type==='frame'){
   try{const result=detector.detectForVideo(data.frame,data.time);self.postMessage({type:'result',points:result.landmarks[0]||null,time:data.time});}
   finally{data.frame.close();}
  }
 }catch(e){self.postMessage({type:'error',message:e.message});}
};
