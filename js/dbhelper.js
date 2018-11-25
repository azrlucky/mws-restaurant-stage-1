/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */

  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    const domain = document.domain;
    return `http://${domain}:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */

  static fetchRestaurants(callback) {
      if (!('indexedDB' in window)) {
        console.log('This browser doesn\'t support IndexedDB');
        DBHelper.fetchRestaurantFromAPI('', callback);
        return;
      } else {
        var dbPromise = idb.open('restaurants-db', 2, function (upgradeDb) {
          console.log('making a new object store');
          if (!upgradeDb.objectStoreNames.contains('restaurant')) {
            upgradeDb.createObjectStore('restaurant', { keyPath: 'id' });
          }
        });
        dbPromise.then(function (db) {
          var tx = db.transaction('restaurant', 'readonly');
          var store = tx.objectStore('restaurant');
          return store.getAll();
        }).then(function (val) {
          if (val) {
            callback(null, val);
          }
          DBHelper.fetchRestaurantFromAPI('', callback);
        }).catch(err => {
          callback(err, null);
          DBHelper.fetchRestaurantFromAPI('', callback);
        });
      }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      DBHelper.fetchRestaurantFromAPI(id, callback);
    } else {
      var dbPromise = idb.open('restaurants-db', 2, function (upgradeDb) {
        console.log('making a new object store');
        if (!upgradeDb.objectStoreNames.contains('restaurant')) {
          upgradeDb.createObjectStore('restaurant', { keyPath: 'id' });
        }
      });
      dbPromise.then(function (db) {
        var tx = db.transaction('restaurant', 'readonly');
        var store = tx.objectStore('restaurant');
        return store.get(parseInt(id, 10));
      }).then(function (val) {
        if (val) {
          callback(null, val);
        } else {
          DBHelper.fetchRestaurantFromAPI(id, function (err, data) {
            if (err) {
              console.log(err);
              return;
            }
            DBHelper.fetchAndSaveDataToIdb(data, callback);
          });
        }
      }).catch(err => {
        callback(err, null);
      });
    }
  }

  static fetchAndSaveDataToIdb(data, callback) {
    var dbPromise = idb.open('restaurants-db', 2, function (upgradeDb) {
      console.log('making a new object store');
      if (!upgradeDb.objectStoreNames.contains('restaurant')) {
        upgradeDb.createObjectStore('restaurant', { keyPath: 'id' });
      }
    });
    dbPromise.then(function (db) {
      var tx = db.transaction('restaurant', 'readwrite');
      var store = tx.objectStore('restaurant');
      store.add(data);
      return tx.complete;
    }).then(function (e) {
      console.log('data inserted');
    });
    callback(null, data);
  }

  static fetchRestaurantFromAPI(id, callback) {
    fetch(DBHelper.DATABASE_URL + '/' + id).then((response) => {
      return response.json();
    }).then((data) => {
      callback(null, data);
    }).catch(err => {
      callback(err, null);
    })
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

