/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */


  static get DB_PROMISE() {
    return idb.open('restaurants-db', 8, function (upgradeDb) {
      console.log('making a new object store');
      if (!upgradeDb.objectStoreNames.contains('restaurant')) {
        upgradeDb.createObjectStore('restaurant', { keyPath: 'id' });
      }
      if (!upgradeDb.objectStoreNames.contains('reviews')) {
        upgradeDb.createObjectStore('reviews', { keyPath: 'id' });
      }
      if (!upgradeDb.objectStoreNames.contains('reviews-unposted')) {
        upgradeDb.createObjectStore('reviews-unposted', { keyPath: 'id', autoIncrement: true });
      }
    });
  }

  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    const domain = document.domain;
    return `http://${domain}:${port}`;
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

      DBHelper.DB_PROMISE.then(function (db) {
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

      DBHelper.DB_PROMISE.then(function (db) {
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
            DBHelper.fetchAndSaveRestaurantDataToIdb(data, callback);
          });
        }
      }).catch(err => {
        callback(err, null);
      });
    }
  }

  static fetchReviewsByRestaurant(restaurantId, callback) {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      DBHelper.fetchReviewsFromAPI(restaurantId, callback);
    } else {

      if (navigator.onLine) {
        DBHelper.fetchReviewsFromAPI(restaurantId, function (err, data) {
          if (err) {
            console.log(err);
            return;
          }
          DBHelper.saveReviewsDataToIdb(data, callback);
        });
      } else {
        DBHelper.DB_PROMISE.then(function (db) {
          var tx = db.transaction('reviews', 'readonly');
          var store = tx.objectStore('reviews');
          return store.getAll();
        }).then(function (val) {
          val = val.filter(review => {
            return review.restaurant_id == restaurantId;
          });
          if (val && val.length > 0) {
            callback(null, val);
          } else {
            callback(null, null);
          }
        }).catch(err => {
          callback(err, null);
        });
      }
    }
  }

  static fetchAndSaveRestaurantDataToIdb(data, callback) {

    DBHelper.DB_PROMISE.then(function (db) {
      var tx = db.transaction('restaurant', 'readwrite');
      var store = tx.objectStore('restaurant');
      store.add(data);
      return tx.complete;
    }).then(function (e) {
      console.log('data inserted');
    });
    callback(null, data);
  }

  static saveReviewsDataToIdb(data, callback) {

    DBHelper.DB_PROMISE.then(function (db) {
      var tx = db.transaction('reviews', 'readwrite');
      var store = tx.objectStore('reviews');
      data.forEach(review => {
        store.put(review);
      });
      return tx.complete;
    }).then(function (e) {
      console.log('data inserted');
    }).catch(err => {
      console.log(err);
    });
    callback(null, data);
  }
  
  static saveUnpostedReviewsDataToIdb(data, callback) {

    DBHelper.DB_PROMISE.then(function (db) {
      var tx = db.transaction('reviews-unposted', 'readwrite');
      var store = tx.objectStore('reviews-unposted');
      store.add(data);
      return tx.complete;
    }).then(function (e) {
      console.log('data inserted');
      callback(null, data);
    }).catch(err => {
      console.log(err);
      callback(err, null);
    });
    
  }

  static fetchRestaurantFromAPI(id, callback) {
    fetch(DBHelper.DATABASE_URL + '/restaurants/' + id).then((response) => {
      return response.json();
    }).then((data) => {
      callback(null, data);
    }).catch(err => {
      callback(err, null);
    })
  }

  static fetchReviewsFromAPI(id, callback) {
    fetch(DBHelper.DATABASE_URL + '/reviews/?restaurant_id=' + id).then((response) => {
      return response.json();
    }).then((data) => {
      callback(null, data);
    }).catch(err => {
      callback(err, null);
    })
  }

  static postNewReview(reviewObj, callback) {
    if (navigator.onLine) {
      DBHelper.postNewReviewToServer(reviewObj, callback);
    } else {
      DBHelper.saveUnpostedReviewsDataToIdb(reviewObj, callback);
    }
  }

  static postNewReviewToServer(reviewObj, callback) {
    fetch(DBHelper.DATABASE_URL + '/reviews/', {
      method: "POST",
      body: JSON.stringify(reviewObj)
    }).then((response) => {
      return response.json();
    }).then((data) => {
      callback(null, data);
    }).catch(err => {
      callback(err, null);
    })
  }

  static syncOutboxReviews() {
    DBHelper.DB_PROMISE.then(function (db) {
      var tx = db.transaction('reviews-unposted', 'readwrite');
      var store = tx.objectStore('reviews-unposted');
      return store.getAll()
    }).then(function (reviews) {
      reviews.forEach(review => {
        const dbId = review.id;
        delete review.id;
        DBHelper.postNewReviewToServer(review, function(err, data) {
          if(!err) {
            DBHelper.DB_PROMISE.then(function (db) {
              var tx = db.transaction('reviews-unposted', 'readwrite');
              var store = tx.objectStore('reviews-unposted');
              return store.delete(dbId);
            }).then(() => {
              console.log('data updated');
            }).catch((err) => {
              console.log('error while updating data');
            });
          }
        });
      });
    }).catch(err => {
      console.log(err);
    });
  }

  static deleteReview(reviewId, callback) {
    fetch(DBHelper.DATABASE_URL + '/reviews/' + reviewId, {
      method: "DELETE"
    }).then((response) => {
      return response.json();
    }).then((data) => {
      DBHelper.DB_PROMISE.then(function (db) {
        var tx = db.transaction('reviews', 'readwrite');
        var store = tx.objectStore('reviews');
        store.delete(data.id);
        return tx.complete;
      }).then(function (e) {
        console.log('data deleted');
      }).catch(err => {
        console.log(err);
      });
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

  static updateRestaurantFavStatus(restaurantId, status) {
    fetch(DBHelper.DATABASE_URL + `/restaurants/${restaurantId}/?is_favorite=${status}`).then((response) => {
      return response.json();
    }).then((data) => {
      
    }).catch(err => {
      console.log(err);
    })
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
    return (`/img/${restaurant.photograph}.jpg`);
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

};

window.addEventListener('online', function(e) {
  DBHelper.syncOutboxReviews();
}, false);