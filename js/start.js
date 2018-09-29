if (navigator.serviceWorker) {
    navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('service worker is registered');
    }).catch((err) => {
        console.log('service worker threw an error: ' + err);
    })
}