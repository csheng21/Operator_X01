chrome.runtime.onMessage.addListener(handleMessages);

function handleMessages(message, sender, sendResponse) {
  if (message.target !== 'offscreen' || message.type !== 'get-geolocation') {
    return false;
  }

  getGeolocation().then((geolocation) => sendResponse(geolocation));
  return true;
}

function getGeolocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      }),
      (error) => reject(error)
    );
  });
}
