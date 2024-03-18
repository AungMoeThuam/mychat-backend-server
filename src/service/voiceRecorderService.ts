class VoiceRecorder {
  private audioBlobs: Blob[];
  private mediaRecorder: null | MediaRecorder;
  private streamBeingCaptured: null | MediaStream;

  start(): Promise<any> {
    if (!navigator.mediaDevices.getUserMedia) {
      return Promise.reject(
        "mediaDevices API or getUserMedia method is not supported in this browser."
      );
    }

    return (
      navigator.mediaDevices
        .getUserMedia({ audio: true } /*of type MediaStreamConstraints*/)
        //returns a promise that resolves to the audio stream
        .then((stream) /*of type MediaStream*/ => {
          //save the reference of the stream to be able to stop it when necessary
          this.streamBeingCaptured = stream;

          //create a media recorder instance by passing that stream into the MediaRecorder constructor
          this.mediaRecorder = new MediaRecorder(
            stream
          ); /*the MediaRecorder interface of the MediaStream Recording
                    API provides functionality to easily record media*/

          //clear previously saved audio Blobs, if any
          this.audioBlobs = [];

          //add a dataavailable event listener in order to store the audio data Blobs when recording
          this.mediaRecorder.addEventListener("dataavailable", (event) => {
            //store audio Blob object
            this.audioBlobs.push(event.data);
          });

          //start the recording by calling the start method on the media recorder
          this.mediaRecorder.start();
        })
    );
  }

  stop(): Promise<any> {
    //return a promise that would return the blob or URL of the recording
    return new Promise((resolve) => {
      //save audio type to pass to set the Blob type
      let mimeType = this.mediaRecorder.mimeType;

      //listen to the stop event in order to create & return a single Blob object
      this.mediaRecorder.addEventListener("stop", () => {
        //create a single blob object, as we might have gathered a few Blob objects that needs to be joined as one
        let audioBlob = new Blob(this.audioBlobs, { type: mimeType });

        //resolve promise with the single audio blob representing the recorded audio
        resolve(audioBlob);
      });
      this.cancel();
    });
  }

  cancel(): void {
    //stop the recording feature
    this.mediaRecorder.stop();

    //stop all the tracks on the active stream in order to stop the stream
    this.stopStream();

    //reset API properties for next recording
    this.resetRecordingProperties();
  }

  stopStream(): void {
    //stopping the capturing request by stopping all the tracks on the active stream
    this.streamBeingCaptured
      .getTracks() //get all tracks from the stream
      .forEach((track) /*of type MediaStreamTrack*/ => track.stop()); //stop each one
  }
  resetRecordingProperties(): void {
    this.mediaRecorder = null;
    this.streamBeingCaptured = null;

    /*No need to remove event listeners attached to mediaRecorder as
    If a DOM element which is removed is reference-free (no references pointing to it), the element itself is picked
    up by the garbage collector as well as any event handlers/listeners associated with it.
    getEventListeners(audioRecorder.mediaRecorder) will return an empty array of events.*/
  }
}
