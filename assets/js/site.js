$(function () {
    window.addEventListener('load', function () {
        FastClick.attach(document.body);
    }, false);

    $('.toggle').click(function (e) {
        e.preventDefault();
        $('.route').fadeToggle();
        $('.alert-box, .progress-limiter').slideToggle();
    });

    $('.stop').click(function (e) {
        e.preventDefault();
        route.clearLayers(map);
        circleMarkers.clearLayers(map);
        endMarker.clearLayers(map);
        currentRoute = null;
        $('.alert-box, .progress-limiter').slideUp();
        $('.stop, .toggle, .route').fadeOut();
    });

    var map = L.mapbox.map('map', 'aj.n6sl9ilg', {
        tileLayer: {
            detectRetina: true
        },
        zoomControl: false
    });

    new L.hash(map);

    var route = L.layerGroup();
    var locationMarker = L.layerGroup();
    var circleMarkers = L.layerGroup();
    var endMarker = L.layerGroup();
    var lastPressed;
    var currentRoute;
    var section = 0;
    var saySomethingOnce = 0;
    var heading = 0;
    var reRouteDistance = 120;
    var madeToNextStepDistance = 50;

    map.on('locationfound', function (e) {
        locationMarker.clearLayers(map);

        var icon = L.divIcon({
            className: 'location-icon',
            iconSize: [25, 25]
        });

        L.marker(e.latlng, {
            icon: icon,
            clickable: false
        }).addTo(locationMarker);
        locationMarker.addTo(map);

        if (lastPressed && currentRoute) {
            checkUserComparedToRoute(currentRoute);
            followUserAndRoute(currentRoute);
        }
        if (e.heading) {
            heading = e.heading;
        } else {
            $('.location-icon').addClass('no-after');
        }
    });

    map.on('locationerror', function (e) {
        console.log('Error: ' + JSON.stringify(e))
    });

    map.locate({
        maxZoom: 19,
        enableHighAccuracy: true,
        watch: true,
        setVeiw: false
    });

    map.on('contextmenu', function (e) {
        lastPressed = e;
        getDirections(locationMarker.getLayers()[0].getLatLng().lng, locationMarker.getLayers()[0].getLatLng().lat, e.latlng.lng, e.latlng.lat, true);
    });

    function getDirections(startLng, startLat, finishLng, finishLat, showMapView) {
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: 'https://api.tiles.mapbox.com/v3/willwhite.map-65rb3vvx/directions/driving/' + startLng + ',' + startLat + ';' + finishLng + ',' + finishLat + '.json?instrucstions=html',
            success: function (e) {

                if (e.error) alert(e.error);

                route.clearLayers(map);
                circleMarkers.clearLayers(map);
                endMarker.clearLayers(map);
                var line = [];
                currentRoute = e;
                var summary = e.routes[0].summary;
                var duration = (e.routes[0].distance * 0.000621371).toFixed(2) + ' miles and ' + Math.round(e.routes[0].duration * 1.3 / 60) + ' minutes';
                $('.route .list, .route .summary, .route .title').empty();
                $('.toggle, .stop').fadeIn();

                for (var i = 0; i < e.routes[0].steps.length; i++) {
                    L.circle([e.routes[0].steps[i].maneuver.location.coordinates[1], e.routes[0].steps[i].maneuver.location.coordinates[0]], 51, {
                        color: '#3c4e5a',
                        // fill: false,
                        weight: 2
                    }).bindPopup('<div>Step: '+ i + '</div><div>Instruction: ' + e.routes[0].steps[i].maneuver.instruction + '</div>')
                    .addTo(circleMarkers);

                    if (e.routes[0].steps[i].maneuver.type.split(' ')[1]) {
                        var icon = e.routes[0].steps[i].maneuver.type.split(' ')[1];
                    } else {
                        var icon = e.routes[0].steps[i].maneuver.type;
                    }

                    var instruct = '<li data-step=' + i + ' class="pad2 mapbox-directions-step" data-lat=' + e.routes[0].steps[i].maneuver.location.coordinates[1] + ' data-lng=' + e.routes[0].steps[i].maneuver.location.coordinates[0] + '>' +
                        '<span class="mapbox-directions-icon mapbox-turn-' + icon + '-icon"></span>' +
                        '<span class="mapbox-directions-step-maneuver pad2x">' + e.routes[0].steps[i].maneuver.instruction +
                        '<span class="mapbox-directions-step-distance fr">' + (e.routes[0].steps[i].distance * 0.000621371).toFixed(2) + ' mi</span>' +
                        '</span>' +
                        '</li>';

                    $('.route .list').append(instruct);
                }

                L.marker([e.routes[0].steps[e.routes[0].steps.length - 1].maneuver.location.coordinates[1], e.routes[0].steps[e.routes[0].steps.length - 1].maneuver.location.coordinates[0]], {
                    icon: L.mapbox.marker.icon({
                        'marker-size': 'small',
                        'marker-color': 'CB8A92'
                    }),
                    draggable: true,
                    riseOnHover: true
                }).addTo(endMarker).on('dragend', function (e) {
                    console.log(e)
                    getDirections(locationMarker.getLayers()[0].getLatLng().lng, locationMarker.getLayers()[0].getLatLng().lat, e.target.getLatLng().lng, e.target.getLatLng().lat, false);
                });;

                if (e.routes[0].steps[section].maneuver.type.split(' ')[1]) {
                    var stepIcon = e.routes[0].steps[section].maneuver.type.split(' ')[1];
                } else {
                    var stepIcon = e.routes[0].steps[section].maneuver.type;
                }

                map.addLayer(circleMarkers);
                map.addLayer(endMarker);

                $('.route .title').append(summary);
                $('.route .summary').append(duration);
                $('.step-icon').html('<span class="mapbox-directions-icon mapbox-turn-' + stepIcon + '-icon"></span>');

                for (var i = 0; i < e.routes[0].geometry.coordinates.length; i++) {
                    line.push([e.routes[0].geometry.coordinates[i][1], e.routes[0].geometry.coordinates[i][0]]);
                    if (e.routes[0].geometry.coordinates.length - 1 == i) {
                        var polyline_options = {
                            color: '#3887BE',
                            weight: 8,
                            opacity: .70
                        };
                        var polyline = L.polyline(line, polyline_options).addTo(route);
                        map.addLayer(route);

                        if (showMapView == true) {
                            map.fitBounds(line, {
                                padding: [10, 10]
                            });
                        }
                    }
                }
            }
        });
    }

    function followUserAndRoute(route) {

        // console.log(locationMarker.getLayers()[0]._icon.style.WebkitTransform = this._icon.style.WebkitTransform + ' rotate(' + this.options.iconAngle + 'deg)';)
        var currentCSS = locationMarker.getLayers()[0]._icon.style.WebkitTransform;
        locationMarker.getLayers()[0]._icon.style.WebkitTransform = locationMarker.getLayers()[0]._icon.style.WebkitTransform + ' rotate(' + heading + 'deg)';

        var userLocation = locationMarker.getLayers()[0].getLatLng();
        var distance = dotToDotDistance(L.latLng(route.routes[0].steps[section].maneuver.location.coordinates[1], route.routes[0].steps[section].maneuver.location.coordinates[0]), userLocation);

        showDirectionAlert((distance), route.routes[0].steps[section].maneuver.instruction);

        if (section > 0) {
            var distanceToStep = (route.routes[0].steps[section - 1].distance);
        } else {
            var distanceToStep = (route.routes[0].steps[0].distance);
        }

        // Flash direction when user is 90% through current step
        if (((distanceToStep - distance) / distanceToStep) * 100 > 90) {
            $('.alert-box .action').addClass('flash');
        } else {
            $('.alert-box .action').removeClass('flash');
        }

        if (distance < madeToNextStepDistance) {
            section++
            saySomethingOnce = 0;
            followUserAndRoute(route)
        } else {
            checkIfUserIsInOtherCircle(route, userLocation); //If not within 50 meters of desired circle, double check if they are within another circle
        }

        if (route.routes[0].steps[section].maneuver.type.split(' ')[1]) {
            var stepIcon = route.routes[0].steps[section].maneuver.type.split(' ')[1];
        } else {
            var stepIcon = route.routes[0].steps[section].maneuver.type;
        }

        $('.step-icon').html('<span class="mapbox-directions-icon mapbox-turn-' + stepIcon + '-icon"></span>');
        $('.progress').attr('width', Math.abs(Math.round(((distanceToStep - distance) / distanceToStep) * 100)) + '%');

        //Only say instructions once
        if (saySomethingOnce == 0) {
            saySomething(encodeURIComponent('In ' + Math.round(distance) + ' meters, ' + route.routes[0].steps[section].maneuver.instruction));
            saySomethingOnce++;
        }
    }

    function showDirectionAlert(distance, maneuver) {
        $('.alert-box .action .distance').html('In ' + Math.round(distance) + ' meters, ');
        $('.alert-box .action .maneuver').html(maneuver);
        $('.alert-box, .progress-limiter').slideDown();
    }

    function saySomething(text) {
        $('.voice').attr('src', 'https://translate.google.com/translate_tts?ie=utf-8&tl=en&q=' + text)
    }

    function checkIfUserIsInOtherCircle(route, user) {
        var i = 0;
        circleMarkers.eachLayer(function (layer) {
            i++
            var distance = dotToDotDistance(layer.getLatLng(), user);
            if (distance < madeToNextStepDistance) {
                section = i; // Update current section to current circle
            }
        });
    }

    function checkUserComparedToRoute(route) {
        var minDistance = [];
        for (var i = 0; i < route.routes[0].geometry.coordinates.length - 1; i++) {
            if ((i + 2)) {
                var userDistance = dotLineDistance(locationMarker.getLayers()[0].getLatLng().lat, locationMarker.getLayers()[0].getLatLng().lng, route.routes[0].geometry.coordinates[i][1], route.routes[0].geometry.coordinates[i][0], route.routes[0].geometry.coordinates[i + 1][1], route.routes[0].geometry.coordinates[i + 1][0], true) * 69.047 * 1609.34;
                minDistance.push(userDistance);
            }
        }

        // Check if the user is within x meters of any segment on route
        if (getMinArray(minDistance) > reRouteDistance) {
            console.log('Recalculating');
            getDirections(locationMarker.getLayers()[0].getLatLng().lng, locationMarker.getLayers()[0].getLatLng().lat, lastPressed.latlng.lng, lastPressed.latlng.lat, false);
            $('.voice').attr('src', 'https://translate.google.com/translate_tts?ie=utf-8&tl=en&q=Recalculating')
            section = 0;
        } else {
            console.log('User is within' + reRouteDistance + 'meters of route')
        }
    }

    function getMinArray(numArray) {
        return Math.min.apply(null, numArray);
    }

    /*
    @param {number} x point's x coord
     * @param {number} y point's y coord
     * @param {number} x0 x coord of the line's A point
     * @param {number} y0 y coord of the line's A point
     * @param {number} x1 x coord of the line's B point
     * @param {number} y1 y coord of the line's B point
     * @param {boolean} overLine specifies if the distance should respect the limits
     * of the segment (overLine = true) or if it should consider the segment as an
     * infinite line (overLine = false), if false returns the distance from the point to
     * the line, otherwise the distance from the point to the segment.
     */

    function dotLineDistance(x, y, x0, y0, x1, y1, o) {
        function lineLength(x, y, x0, y0) {
            return Math.sqrt((x -= x0) * x + (y -= y0) * y);
        }
        if (o && !(o = function (x, y, x0, y0, x1, y1) {
            if (!(x1 - x0)) return {
                x: x0,
                y: y
            };
            else if (!(y1 - y0)) return {
                x: x,
                y: y0
            };
            var left, tg = -1 / ((y1 - y0) / (x1 - x0));
            return {
                x: left = (x1 * (x * tg - y + y0) + x0 * (x * -tg + y - y1)) / (tg * (x1 - x0) + y0 - y1),
                y: tg * left - tg * x + y
            };
        }(x, y, x0, y0, x1, y1), o.x >= Math.min(x0, x1) && o.x <= Math.max(x0, x1) && o.y >= Math.min(y0, y1) && o.y <= Math.max(y0, y1))) {
            var l1 = lineLength(x, y, x0, y0),
                l2 = lineLength(x, y, x1, y1);
            return l1 > l2 ? l2 : l1;
        } else {
            var a = y0 - y1,
                b = x1 - x0,
                c = x0 * y1 - y0 * x1;
            return Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);
        }
    };

    function dotToDotDistance(point1, point2) {
        return point1.distanceTo(point2);;
    }

});
