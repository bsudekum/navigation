$(function () {
    window.addEventListener('load', function () {
        FastClick.attach(document.body);
    }, false);

    $('.toggle').click(function (e) {
        e.preventDefault();
        $('.route').fadeToggle();
        $('.alert-box').slideToggle();
    });

    $('.stop').click(function (e) {
        e.preventDefault();
        route.clearLayers(map);
        currentRoute = null;
        $('.alert-box').slideUp();
        $('.stop, .toggle').fadeOut();
    });

    var map = L.mapbox.map('map', 'aj.n6sl9ilg', {
        tileLayer: {
            detectRetina: true
        }
    });

    var route = L.layerGroup();
    var allMarkers = L.layerGroup();
    var locationMarker = L.layerGroup();
    var lastPressed;
    var currentRoute;
    var section = 0;

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
    });

    map.on('locationerror', function (e) {
        console.log('Error: ' + r)
    });

    map.on('move', function (e) {
        map.locate({
            setView: false
        });
    });

    map.locate({
        setView: true,
        maxZoom: 19,
        enableHighAccuracy: true,
        watch: true
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
                var line = [];
                currentRoute = e;
                var summary = e.routes[0].summary;
                var duration = (e.routes[0].distance * 0.000621371).toFixed(2) + ' miles and ' + Math.round(e.routes[0].duration * 1.3 / 60) + ' minutes';
                $('.route .list, .route .summary, .route .title').empty();
                $('.toggle, .stop').fadeIn();
                showDirectionAlert(e.routes[0].steps[0].maneuver.instruction)

                for (var i = 0; i < e.routes[0].steps.length; i++) {
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
                $('.route .title').append(summary);
                $('.route .summary').append(duration);

                for (var i = 0; i < e.routes[0].geometry.coordinates.length; i++) {
                    line.push([e.routes[0].geometry.coordinates[i][1], e.routes[0].geometry.coordinates[i][0]]);
                    if (e.routes[0].geometry.coordinates.length - 1 == i) {
                        var polyline_options = {
                            color: '#3887BE',
                            weight: 9,
                            opacity: .70
                        };
                        var polyline = L.polyline(line, polyline_options).addTo(route);
                        map.addLayer(route);

                        if (showMapView == true) {
                            map.fitBounds(line, {
                                padding: [50, 10]
                            });
                        }
                    }
                }
            }
        });
    }
    $('.alert-box').slideUp();

    function followUserAndRoute(route) {
        console.log(route)
        var from = L.latLng(route.routes[0].geometry.coordinates[section][1], route.routes[0].geometry.coordinates[section][0]);
        var distance = from.distanceTo(locationMarker.getLayers()[0].getLatLng());
        console.log(distance)
        if (distance < 51) {
            section++
            showDirectionAlert(route.routes[0].steps[section].maneuver.instruction)
            console.log(section)
        } else {
            console.log(section)
        }
    }

    function showDirectionAlert(text) {
        $('.alert-box .action').html(text);
        $('.alert-box').slideDown();
    }

    function checkUserComparedToRoute(route) {

        var minDistance = [];
        for (var i = 0; i < route.routes[0].geometry.coordinates.length - 1; i++) {
            if ((i + 2)) {
                var userDistance = dotLineDistance(locationMarker.getLayers()[0].getLatLng().lat, locationMarker.getLayers()[0].getLatLng().lng, route.routes[0].geometry.coordinates[i][1], route.routes[0].geometry.coordinates[i][0], route.routes[0].geometry.coordinates[i + 1][1], route.routes[0].geometry.coordinates[i + 1][0], true) * 69.047 * 1609.34;
                minDistance.push(userDistance);
            }
        }
        if (getMaxOfArray(minDistance) > 200) {
            alert('Recalculating')
            getDirections(locationMarker.getLayers()[0].getLatLng().lng, locationMarker.getLayers()[0].getLatLng().lat, lastPressed.latlng.lng, lastPressed.latlng.lat, false);
            $('body').append('<iframe src="https://translate.google.com/translate_tts?ie=utf-8&tl=en&q=Recalculating" frameborder="0" style="display:none"></iframe>');
            section = 0;
        } else {
            console.log('User is within 200 meters of route')
        }
    }

    function getMaxOfArray(numArray) {
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

});
