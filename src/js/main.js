(function () {

    'use strict';

    const nasaInsightWeather = (function () {

        'use strict';

        const API_KEY = 'DEMO_KEY';
        const API_URL = 'https://api.nasa.gov/insight_weather/?api_key=' + API_KEY + '&feedtype=json&ver=1.0';

        function extractSolData(sol) {
            return {
                avgTemp: sol.AT.av,
                maxTemp: sol.AT.mx,
                minTemp: sol.AT.mn,
                earthDate: sol.First_UTC,
                season: sol.Season,
            };
        }

        function extractAllSols(data) {

            // Keys to sol objects 
            // -- reverse to place most recent in front
            const solKeys = data.sol_keys.reverse();

            if (solKeys.length < 1) {
                throw new Error('Empty sol data from API call.');
            }

            // Set up the sol data to use 
            return solKeys.map(function (solDay) {

                const solData = extractSolData(data[solDay])

                return Object.assign({ day: solDay }, solData);
            });
        }

        return {
            API_URL,
            extractAllSols
        };


    })();

    const storage = (function () {

        'use strict';

        const storageKey = 'mars_data';
        /* 43200000 = 12h */
        const apiTimeout = 43200000;

        function storeSolData(data) {

            try {
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (error) {
                // Silent error
                return;
            }

        }

        function getSolData() {
            const data = localStorage.getItem(storageKey);

            return JSON.parse(data);
        }


        function getSols() {

            try {
                return getSolData().sols;
            } catch (error) {
                throw new Error('No sol data stored.');
            }
        }

        function isRecentlyUpdated() {

            try {
                var timestamp = getSolData().timestamp;
            } catch (error) {
                return false;
            }

            return (Date.now() - timestamp < apiTimeout);
        }


        return {
            storeSolData,
            getSols,
            isRecentlyUpdated,
        };

    })();

    const temperature = (function () {

        'use strict';

        const celsiusButton = document.querySelector('#celsius');


        function celsiusToFahrenheit(celsius) {
            return Math.round(9 / 5 * celsius + 32);
        }

        function fahrenheitToCelsius(fahrenheit) {
            return Math.round(5 / 9 * (fahrenheit - 32));
        }

        function isCelsius() {
            return celsiusButton.checked;
        }

        function displayTemp(number) {
            if (!isCelsius()) {
                return celsiusToFahrenheit(number);
            }
            return Math.round(number);
        }

        function updateTemperatures(conversionFunction) {
            /* Not a live Node list, therefore select them here */
            const solTemperatures = document.querySelectorAll('[data-sol-temp]');

            solTemperatures.forEach(function (solTemp) {
                solTemp.innerText = conversionFunction(solTemp.textContent * 1);
            });

        }

        function toggleUnit(event) {

            if (!event.target.closest('[data-temp-unit]')) {
                return;
            }

            if (isCelsius()) {
                updateTemperatures(fahrenheitToCelsius);
            } else {
                updateTemperatures(celsiusToFahrenheit);
            }
        }

        document.addEventListener('change', toggleUnit, false);

        return {
            displayTemp
        };

    })();

    const appView = (function () {

        'use strict';

        const heroHeader = document.querySelector('[data-hero-header]');
        const mainElement = document.querySelector('[data-main]');
        const previousSolsContainer = document.querySelector('[data-previous-sols-container]');
        const previousSols = document.querySelector('[data-previous-sols]');

        function showMain() {
            mainElement.classList.add('show');
        }

        function displayDate(dateString) {
            return new Date(dateString)
                .toLocaleDateString(
                    'en-GB', {
                    day: 'numeric',
                    month: 'long'
                });
        }

        function element(selector) {
            return document.querySelector(selector);
        }

        function displayMainSol(sol) {
            element('[data-sol-day]').innerText = sol.day;
            element('[data-sol-earth-date]').innerText = displayDate(sol.earthDate);
            element('[data-sol-temp="avg"]').innerText = temperature.displayTemp(sol.avgTemp);
            element('[data-sol-temp="high"]').innerText = temperature.displayTemp(sol.maxTemp);
            element('[data-sol-temp="low"]').innerText = temperature.displayTemp(sol.minTemp);
            element('[data-sol-season]').innerText = sol.season;
        }

        // Html template for previous sols
        function createPreviousSol(sol) {
            return (
                '<tr>' +
                '<td class="table-cell">Sol <span data-sol-day>' + sol.day + '</span></td>' +
                '<td class="table-cell" data-sol-earth-date>' + displayDate(sol.earthDate) + '</td>' +
                '<td class="table-cell">' +
                '<span data-sol-temp="avg">' + temperature.displayTemp(sol.avgTemp) + '</span>°</td>' +
                '<td class="table-cell">' +
                '<span data-sol-temp="high">' + temperature.displayTemp(sol.maxTemp) + '</span>°</td>' +
                '<td class="table-cell">' +
                '<span data-sol-temp="low">' + temperature.displayTemp(sol.minTemp) + '</span>°</td>' +
                '</tr>'
            );
        }

        function displayPreviousSols(sols) {

            sols.forEach(function (sol) {
                // Create an html string of the sol
                const previousSol = createPreviousSol(sol);

                // Add the sol to the previous sols
                previousSols.insertAdjacentHTML('beforeend', previousSol);
            });
        }

        function displayAllSols(sols) {

            if (!sols) {
                try {
                    sols = storage.getSols();
                } catch (error) {
                    throw error;
                }
            }

            displayMainSol(sols[0]);
            displayPreviousSols(sols);
        }

        function displayNoSolsFound() {

            const message1 = 'Sorry, could not find any sols at the moment.';
            const message2 = 'Please try again later.';

            // Empty content
            heroHeader.outerHTML = '';
            previousSolsContainer.outerHTML = '';

            const noSolsFoundElement = '<div class="container vertical-padding">' +
                '<p>' + message1 + '</p>' +
                '<p>' + message2 + '</p>' +
                '</div>';

            // Display message
            mainElement.innerHTML = noSolsFoundElement;
        }

        return {
            displayAllSols,
            displayNoSolsFound,
            showMain,
        };

    })();

    const loader = (function () {

        'use strict';

        const loader = document.querySelector('[data-loader]');
        const spinner = document.querySelector('[data-spinner]');

        // Show loader when loading data takes a bit too long
        let loaderTimeout;
        const timeoutMs = 500;

        function hideLoader() {
            loader.classList.add('hide');
            loader.style.display = 'none';
        }

        function showLoader() {
            loader.style.display = 'block';
        }

        function stopSpinner() {
            spinner.style.animationPlayState = 'paused';
        }

        function start() {
            // Start loader when loading data takes a bit too long
            loaderTimeout = setTimeout(function () {
                showLoader();
            }, timeoutMs);
        }

        function stop() {
            clearTimeout(loaderTimeout);
            hideLoader();
            stopSpinner();
        }

        return {
            start,
            stop,
        };

    })();

    function displayAndStoreSols(data) {

        // Set up the sol data 
        const sols = nasaInsightWeather.extractAllSols(data);

        // Display sols in app
        appView.displayAllSols(sols);

        // Store the sol data
        storage.storeSolData({
            timestamp: Date.now(),
            sols
        });

    }


    function getDataFromApi() {

        return new Promise(function (resolve, reject) {

            fetch(nasaInsightWeather.API_URL)
                .then(function (res) {
                    if (!res.ok) {
                        reject(new Error('Nasa API response not ok.'));
                    }
                    return res.json();
                })
                .then(function (data) {
                    resolve(displayAndStoreSols(data));
                })
                .catch(function (error) {
                    reject(error);
                });
        })
    }

    function initializeSols() {

        return new Promise(function (resolve, reject) {

            try {
                // Check last api call
                if (storage.isRecentlyUpdated()) {
                    // Display stored sols
                    resolve(appView.displayAllSols());

                } else {
                    // Call api
                    resolve(getDataFromApi());
                }

            } catch (error) {
                reject(error);
            }
        });
    }

    /* Initialize */
    (function () {

        // Start loader when loading data takes a bit too long
        loader.start();

        initializeSols()
            .catch(function (error) {
                // Neither stored sols nor api went through
                // Display message that no sols were found
                appView.displayNoSolsFound();

            }).then(function () {

                // Stop loader
                loader.stop();

                // Make main visible
                appView.showMain();
            });

    })();

})();
