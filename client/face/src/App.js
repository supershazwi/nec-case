import {useState, useEffect} from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import { SpinnerRound } from 'spinners-react';


export default function App() {
  const [selectedFile, setSelectedFile] = useState();
  const [displayImage, setDisplayImage] = useState();
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    // set loading to true
    setLoading(true);

    const image = await faceapi.bufferToImage(selectedFile);
    
    // load faceapi models
    Promise.all([
      faceapi.nets.faceRecognitionNet.loadFromUri('/weights'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/weights'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('/weights')
    ]).then(async () => {
      // hide loading spinner and show stat box
      setLoading(false);

      // create a container to house the image that we have uploaded
      const container = document.createElement('div');
      container.style.position = 'relative';
      document.getElementById('results').append(container);

      const canvas = faceapi.createCanvasFromMedia(image);
      canvas.id = 'canvas';
      container.append(canvas);

      const displaySize = {width: image.width, height: image.height};
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();
      
      if (detections.length === 0) {
        alert('No face detected');
        return;
      }
      const resizeDetections = faceapi.resizeResults(detections, displaySize);
      resizeDetections.forEach(detection => {
        // show display of stats
        document.getElementById('stat-details').style.display = 'block';

        const box = detection.detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {label: 'Face'});
        drawBox.draw(canvas);
        const landmarksBox = new faceapi.draw.drawFaceLandmarks(canvas, detection);

        const heightElement = document.createElement('p');
        const height = detection.detection.box.height;
        heightElement.innerText = `height: ${height}px`;
        document.getElementById('score1-details').appendChild(heightElement);

        const widthElement = document.createElement('p');
        const width = detection.detection.box.width;
        widthElement.innerText = `width: ${width}px`;
        document.getElementById('score1-details').appendChild(widthElement);

        // take face box detection as face width and height
        const height2WidthElement = document.createElement('p');
        const height2WidthRatio = detection.detection.box.height / detection.detection.box.width;
        height2WidthElement.innerText = `height to width ratio: ${height2WidthRatio}`;
        document.getElementById('score1-details').appendChild(height2WidthElement);

        // first score
        let score1;
        if (height2WidthRatio <= 1.6) {
          score1 = height2WidthRatio / 1.6 * 10;
        } else {
          score1 = (1.6 - (height2WidthRatio - 1.6)) / 1.6 * 10;
        }
        
        document.getElementById('score1').innerHTML = score1;

        // points 36 to points 47 (0-indexed) are eye points. take average y values.
        let sumToEyes = 0;
        detection.landmarks.positions.slice(36, 48).forEach(xy => sumToEyes += xy.y);

        // to get forehead to eyes distance, get the y coordinate of eyes - y coordinate of the drawn box
        const foreHeadToEyesElement = document.createElement('p');
        const foreHeadToEyes = sumToEyes/12 - detection.detection.box.y;
        foreHeadToEyesElement.innerText = `distance from forehead to eyes: ${foreHeadToEyes}px`;
        document.getElementById('score2-details').appendChild(foreHeadToEyesElement);

        // bottom of nose is point 33 (0-indexed)
        const eyesToNoseElement = document.createElement('p');
        const eyesToNose = detection.landmarks.positions[33]['y'] - (sumToEyes/12);
        eyesToNoseElement.innerText = `distance from eyes to nose: ${eyesToNose}px`;
        document.getElementById('score2-details').appendChild(eyesToNoseElement);

        // bottom of chin is point 8 (0-indexed)
        const noseToChinElement = document.createElement('p');
        const noseToChin = detection.landmarks.positions[8]['y'] - detection.landmarks.positions[33]['y'];
        noseToChinElement.innerText = `distance from nose to chin: ${noseToChin}px`;
        document.getElementById('score2-details').appendChild(noseToChinElement);

        // score 2 
        // get difference between the Max and Min of 3 distances
        const differenceBtwMaxAndMin = Math.max(foreHeadToEyes, eyesToNose, noseToChin) - Math.min(foreHeadToEyes, eyesToNose, noseToChin);
        const score2 = (Math.max(foreHeadToEyes, eyesToNose, noseToChin) - differenceBtwMaxAndMin) / Math.max(foreHeadToEyes, eyesToNose, noseToChin) * 10;
        document.getElementById('score2').innerHTML = score2;

        // width of eye 1 is point 36 to 39 (0-indexed)
        const firstEyeWidth = detection.landmarks.positions[39]['x'] - detection.landmarks.positions[36]['x'];
        // width of eye 2 is point 42 to 45 (0-indexed)
        const secondEyeWidth = detection.landmarks.positions[45]['x'] - detection.landmarks.positions[42]['x'];
        
        const eyeWidthElement = document.createElement('p');
        const eyeWidth = (secondEyeWidth + firstEyeWidth) / 2;
        eyeWidthElement.innerText = `eye width: ${eyeWidth}px`;
        document.getElementById('score3-details').appendChild(eyeWidthElement);

        // distance between both eyes is between point 39 and point 42 (0-indexed)
        const distanceBetweenEyesElement = document.createElement('p');
        const distanceBetweenEyes = detection.landmarks.positions[42]['x'] - detection.landmarks.positions[39]['x'];
        distanceBetweenEyesElement.innerText = `distance between both eyes: ${distanceBetweenEyes}px`;
        document.getElementById('score3-details').appendChild(distanceBetweenEyesElement);

        // score 3
        const score3 = eyeWidth / distanceBetweenEyes * 10;
        document.getElementById('score3').innerHTML = score3;

        // total score out of 10. average of score 1 + score 2 + score 3 
        const totalScore = (score1 + score2 + score3) / 3;
        document.getElementById('overall-score').innerHTML = `Total score: ${totalScore.toFixed(2)} out of 10`;
      });
    });
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setDisplayImage(URL.createObjectURL(event.target.files[0]));
    
    document.getElementById('stat-details').style.display = 'none';
    if (document.getElementById('canvas')) {
      document.getElementById('canvas').remove();
    }
  };

  return (
    <>
    <div className="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <form onSubmit={(event) => handleFormSubmit(event)}>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <p className="emoji text-center">😉</p>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Beauty Score v1.0</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Upload a face portrait and determine a beauty score.
          </p>
        </div> 
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <input type="file" name="file" id="upload" onChange={handleFileChange} />
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 mt-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Give me a score
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <div className="min-h-full flex flex-col justify-center sm:px-6 lg:px-8 items-center">
      <SpinnerRound size={65} thickness={100} speed={100} color="rgba(219, 39, 119, 1)" secondaryColor="rgba(0, 0, 0, 0.44)" enabled={loading} />
    </div>
  
    <div className="min-h-full flex flex-col justify-center sm:px-6 lg:px-8 hidden" id="stat-details">
      <div className="min-h-full flex flex-col justify-center py-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-extrabold text-gray-900" id="overall-score"></h2>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
          <dt className="text-sm font-medium text-gray-500 truncate text-center">Score 1: Height to width ratio against golden ratio</dt>
          <dd className="mt-1 mb-4 text-3xl font-semibold text-gray-900 text-center" id="score1"></dd>
          <hr />
          <dd className="mt-4 text-sm font-medium text-gray-500" id="score1-details">
          </dd>
        </div>
        <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
          <dt className="text-sm font-medium text-gray-500 truncate text-center">Score 2: Similar lengths of forehead to eyes, eyes to nose, nose to chin</dt>
          <dd className="mt-1 mb-4 text-3xl font-semibold text-gray-900 text-center" id="score2"></dd>
          <hr />
          <dd className="mt-4 text-sm font-medium text-gray-500" id="score2-details">
          </dd>
        </div>
        <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6">
          <dt className="text-sm font-medium text-gray-500 truncate text-center">Score 3: Ratio of eye width to distance between eyes</dt>
          <dd className="mt-1 mb-4 text-3xl font-semibold text-gray-900 text-center" id="score3"></dd>
          <hr />
          <dd className="mt-4 text-sm font-medium text-gray-500" id="score3-details">
          </dd>
        </div>
      </dl>
    </div>
    <div id="results" className="mt-5" style={{display: 'flex', justifyContent: 'center'}}>
      <img src={displayImage} style={{position: 'absolute'}}/>
    </div>
    </>
  );
}