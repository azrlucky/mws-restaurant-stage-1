let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiYXpybHVja3kiLCJhIjoiY2pqZjQyMWRiNHU4OTNrcDFjN3hmYjJ5MiJ9.U-cVUgNL7EEQ5Dy3r9SOXw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
      hideMapFromReader();
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name + ' Restaurant';

  const favCheck = document.getElementById('fav-check');
  favCheck.checked = restaurant.is_favorite;

  const favSpan = document.querySelector('#fav-check+span');
  favSpan.setAttribute('aria-checked', restaurant.is_favorite);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchReviewsByRestaurant(restaurant.id, (error, reviews) => {
    self.restaurant.reviews = reviews;
    if (!reviews) {
      reviews = [];
    }
    fillReviewsHTML();
  })
}

hideMapFromReader = () => {
  const nodes = document.querySelectorAll('#map, #map a, #map img.leaflet-marker-icon');
  nodes.forEach(node => {
    node.setAttribute('tabindex', '-1');
  });
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  // const title = document.createElement('h3');
  // title.innerHTML = 'Reviews';
  // container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach((review, index) => {
    ul.appendChild(createReviewHTML(review, index));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review, index) => {
  const li = document.createElement('li');
  const div = document.createElement('div');
  div.id = 'review-name-wrapper-' + index;
  div.classList = 'review-name-wrapper';

  const name = document.createElement('p');
  name.innerHTML = review.name;
  div.appendChild(name);

  const date = document.createElement('p');
  const dateObj = new Date(review.createdAt);
  date.innerHTML = dateObj.toLocaleDateString();
  div.appendChild(date);

  const deleteBtn = document.createElement('button');
  deleteBtn.classList = 'review-delete-btn';
  deleteBtn.innerHTML = 'x';
  deleteBtn.setAttribute('review-id', review.id);
  deleteBtn.onclick = deleteReview;

  li.appendChild(div);

  const ratingWrapper = document.createElement('div');
  ratingWrapper.classList = 'rating-wrapper'

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.id = 'review-rating-' + index;
  rating.classList = 'review-rating';
  ratingWrapper.appendChild(rating);
  ratingWrapper.appendChild(deleteBtn);
  li.appendChild(ratingWrapper);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.id = 'review-comments-' + index;
  comments.classList = 'review-comments';
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

toggleReviewForm = () => {
  var element = document.getElementById("review-form");
  element.classList.toggle("open");
}

sendNewReview = () => {
  const name = document.getElementById('reviewer-name');
  const rating = document.getElementById('review-rating');
  const comments = document.getElementById('review-comment');

  if (name.value && rating.value && comments.value) {
     DBHelper.postNewReview({
      restaurant_id: getParameterByName('id'),
       name: name.value,
       rating: rating.value,
       comments: comments.value
     }, (err, data) => {
       if (err) {
         console.log(err);
       } else {
         alert('review added');
         location.reload();
       }
     })
  }else {
    alert('Please fill all details for a new review to be added.');
  }
}

deleteReview = (event) => {
  const el = event.target;
  const reviewId = el.getAttribute('review-id');
  DBHelper.deleteReview(reviewId, (e, data) => {
    if (e) {
      console.log(e);
    } else {
      alert('comment deleted');
      location.reload();
    }
  })
}

onFavChange = (event) => {
  const status = event.target.checked;
  const restoId = getParameterByName('id');
  const favSpan = document.querySelector('#fav-check+span');
  favSpan.setAttribute('aria-checked', status);
  DBHelper.updateRestaurantFavStatus(restoId, status);
}