/*jslint white: true, devel: true, onevar: true, browser: true, undef: true, nomen: true, regexp: false, plusplus: false, bitwise: true, newcap: true, maxerr: 50, indent: 4 */

/**
 * rdbEmbedButtons - Provides rich functionality for the embeddable buttons, and is part of the iframe that gets rendered.
 *                   Differs from rdbEmbed which is the injected script that will render the embed iframe itself.
**/
window.rdbEmbedButtons = (function () {
    var urlParams = {},
        messageCallbacks;

    /******* UTILITY METHODS *******/

    /**
     * If we were passed a URL (with very basic checking: Just make sure it's http or https.), return it.
     *
     * @return string|null
    **/
    function getPassedUrl() {
        if (urlParams.hasOwnProperty('url') && urlParams.url.search(/https?:\/\//i) === 0) {
            return urlParams.url;
        }

        return null;
    }

    /**
     * Given a relative URL (blog.html), resolve it to a full URL (http://blah.com/blog.html)
     * Additionally cleans the URL to be properly URI encoded - works around a safari bug
     * where window.location.href is not fully URI encoded.
     *
     * @param url string - the url to absolutize.
     * @return string - the resultant absolute URL.
    **/
    function resolveUrl(url) {
        var a = document.createElement('a');
        a.href = url;
        return a.href;
    }

    /**
     * Given a string, make sure it adheres to 6-digit hex code, or 'transparent'.
     *
     * @param color - string, the color uncleaned.
     * @return string the cleaned color.
    **/
    function cleanColor(color) {
        if (color.toLowerCase() === "transparent") {
            return "transparent";
        } else {
            return '#' + color.replace(/[^0-9A-F]/gi, '').substring(0, 6);
        }
    }


    /******* EVENT HANDLING *******/

    /**
     * The callbacks that we'll be listening for from our iframe. These are currently only relevant for save.
     * Each callback expects an Object of arguments.
    **/
    messageCallbacks = {
        "queue_success": function (args) {
            document.getElementById('readLater').innerHTML = 'Saved';
        },
        "send_to_kindle_success": function (args) {
            document.getElementById('sendToKindle').innerHTML = 'Sent';
        },
        "kindle_setup_cancelled": function (args) {
            var kindleButton = document.getElementById('sendToKindle');

            kindleButton.innerHTML = 'Send <span>to</span> Kindle';
            kindleButton.setAttribute('data-clicked', '0');
        },
        "kindle_setup_success": function (args) {
            var kindleButton = document.getElementById('sendToKindle');

            kindleButton.innerHTML = 'Send <span>to</span> Kindle';
            kindleButton.setAttribute('data-clicked', '0');
        }
    };

    /**
     * Cross browser addEventListener from http://snipplr.com/view.php?codeview&id=3116
     *
     * @param evnt - the event to listen for, like "click"
     * @param elem - the element onto which to attach said event
     * @param func - the callback which will be called on event.
     * @return boolean - True on successful attach.
    **/
    function listen(evnt, elem, func) {
        if (elem.addEventListener) { // W3C DOM
            elem.addEventListener(evnt, func, false);
        } else if (elem.attachEvent) { // IE DOM
            elem.attachEvent("on" + evnt, func);
        } else {
            return false;
        }

        return true;
    }

    /**
     * Send a message to this windows parent, using the convention we've established.
     *
     * @param msg          - object - typically of the form {"event": "[eventname]", "args": {"param": "[a dictionary of arguments]"}}
     * @param targetOrigin - string - optional target origin for the postMessage.
     * @return void
    **/
    function sendMessage(msg, targetOrigin) {
        targetOrigin = targetOrigin || '*';

        if (window.parent) {
            window.parent.postMessage(JSON.stringify(msg), targetOrigin);
        }
    }

    /**
     * receiveMessage support in the format that we're expecting.
     *
     * @param event - the event
     * @return void
    **/
    function receiveMessage(event) {
        var eventObject = JSON.parse(event.data),
            eventName,
            eventArgs;

        /** The event was passed in a way we're not expecting. Fail. **/
        if (typeof eventObject !== "object") {
            return false;
        }

        eventName = eventObject.event;
        eventArgs = eventObject.args;

        if (messageCallbacks.hasOwnProperty(eventName)) {
            return messageCallbacks[eventName](eventArgs, event);
        }
    }



    /******* SESSION METHODS *******/

    /**
     * Look for a token cookie, and set readabilityToken if we had one.
     *
     * @return void
    **/
    function checkToken() {
        var hasToken = document.cookie.indexOf('readabilityToken=') !== -1;

        if (hasToken) {
            window.readabilityToken = document.cookie.match(/readabilityToken=([^;]+)/)[1];
        } else {
            window.readabilityToken = null;
        }
    }

    /******* INTERACTION METHODS *******/

    /**
     * If we have a readabilityToken, send the token to the parent iframe
     * before calling so that we can identify the user.
     *
     * @return void
    **/
    function sendToken() {
        // Todo make targetOrigin specific?
        if (window.readabilityToken) {
            sendMessage({
                "event": "set_token",
                "args": {
                    "token": window.readabilityToken
                }
            });
        }
    }

    /**
     * "Read Now" was clicked, send the message to the parent iframe that it should be activated.
     *
     * @return boolean false to avoid event bubbling
    **/
    function sendRead() {
        sendToken();
        sendMessage({
            "event": "trigger_read",
            "args": {
                "url": getPassedUrl()
            }
        });

        return false;
    }

    /**
     * "Read Later" was clicked, send the message to the parent iframe that it should be activated.
     *
     * @return boolean false to avoid event bubbling
    **/
    function sendSave() {
        var readLater = document.getElementById('readLater');

        if (readLater.getAttribute('data-clicked') == '1') {
            return false;
        }

        sendToken();
        sendMessage({
            "event": "trigger_save",
            "args": {
                "url": getPassedUrl()
            }
        });

        document.getElementById('readLater').innerHTML = 'Saving';
        document.getElementById('readLater').setAttribute('data-clicked', 1);

        return false;
    }

    /**
     * "PrintNow" was clicked, send the message to the parent iframe that it should be activated.
     *
     * @return boolean false to avoid event bubbling
    **/
    function sendPrint() {
        sendToken();
        sendMessage({
            "event": "trigger_print",
            "args": {
                "url": getPassedUrl()
            }
        });

        return false;
    }

    /**
     * "Email" was clicked, send the message to the parent iframe that it should be activated.
     *
     * @return boolean false to avoid event bubbling
    **/
    function email() {
        url = resolveUrl(getPassedUrl());
        window.rdbEmailWindow = window.open('/email?url=' + encodeURIComponent(url), 'rdbEmailWindow', 'chrome=yes,centerscreen=yes,width=800,height=580');
        return false;
    }

    /**
     * "Read Later" was clicked, send the message to the parent iframe that it should be activated.
     *
     * @return boolean false to avoid event bubbling
    **/
    function sendSendToKindle() {
        var sendToKindle = document.getElementById('sendToKindle');

        if (sendToKindle.getAttribute('data-clicked') == '1') {
            return false;
        }

        sendToken();
        sendMessage({
            "event": "trigger_send_to_kindle",
            "args": {
                "url": getPassedUrl()
            }
        });

        document.getElementById('sendToKindle').innerHTML = 'Sending';
        document.getElementById('sendToKindle').setAttribute('data-clicked', 1);

        return false;
    }

    /**
     * "Setup Kindle" was clicked.
     *
     * @return boolean false to avoid event bubbling
    **/
    function sendSetupKindle() {
        sendToken();
        sendMessage({
            "event": "trigger_setup_kindle",
            "args": {
                "url": getPassedUrl()
            }
        });

        return false;
    }

    /**
     * Look at the URL Params that were passed and colorize the buttons (bg/fg color) if it was passed.
     *
     * @return void
    **/
    function colorizeButtons() {
        if (urlParams.hasOwnProperty('bgColor')) {
            document.getElementById('readabilityContainer').style.backgroundColor = cleanColor(urlParams.bgColor);
        }

        if (urlParams.hasOwnProperty('textColor')) {
            document.getElementById('readText').style.color = cleanColor(urlParams.textColor);
        }
    }

    /**
     * Given our iFrame's URL parameters, set the proper display of buttons, layout, and color.
     *
     * @return void
    **/
    function displaySections() {
        var active = {
                read        : urlParams.hasOwnProperty('showRead') && urlParams.showRead === "0",
                kindle      : urlParams.hasOwnProperty('showSendToKindle') && urlParams.showSendToKindle !== "0",
                print       : urlParams.hasOwnProperty('showPrint') && urlParams.showPrint !== "0",
                email       : urlParams.hasOwnProperty('showEmail') && urlParams.showEmail !== "0",
                orientation : urlParams.hasOwnProperty('orientation') && urlParams.orientation !== "0",
                version     : urlParams.hasOwnProperty('version')
            },
            displayProp = active.orientation ? "block" : "inline-block",
            b = "embed-button",
            l = " embed-button-left",
            r = " embed-button-right";

        // Set orientation
        if (active.orientation) {
            document.getElementById('readabilityContainer').className = 'vertical';
        }

        // Hide Read Now/ Later
        if (active.read) {
            document.getElementById('readChunk').style.display = 'none';
        }

        // Show Print
        if (active.print) {
            if (!active.email && !active.kindle) {
                document.getElementById('sendPrint').className = b + l + r;
            }

            document.getElementById('sendPrint').style.display = displayProp;
        }

        // Show Email
        if (active.email) {
            if (!active.print && active.kindle) {
                document.getElementById('email').className = b + l;

            } else if (active.print && !active.kindle) {
                document.getElementById('email').className = b + r;

            } else if (!active.print && !active.kindle) {
                document.getElementById('email').className = b + l + r;
            }

            document.getElementById('email').style.display = displayProp;
        }

        // Show Kindle
        if (active.kindle) {
            if (!active.print && !active.email) {
                document.getElementById('sendToKindle').className = b + l + r;
            }

            document.getElementById('sendToKindle').style.display = displayProp;

            /* If it looks like they've previously set up their Kindle User Details, show the gear. */
            if (document.cookie.indexOf('kindleUserDetails') !== -1) {
                if (active.orientation) {
                    document.getElementById('setupKindle').className = b + l + r;
                }

                document.getElementById('setupKindle').style.display = displayProp;
            }
        }
    }


    /******* INITIALIZATION METHODS *******/

    /**
     * Split out our URL parameters and set them to the scoped "urlParams" object as key/value pairs.
     *
     * @return void
    **/
    function initUrlParams() {
        var querySplitter = new RegExp("([^?=&]+)(=([^&]*))?", "g");

        window.location.search.replace(querySplitter, function ($0, $1, $2, $3) {
            urlParams[$1] = decodeURIComponent($3);
        });
    }

    /**
     * Initialize the embed butons. Colorize and start listening for messages.
     *
     * @return void
    **/
    function init() {
        checkToken();
        initUrlParams();
        colorizeButtons();
        displaySections();

        /* Start listening for any events */
        listen("message", window, receiveMessage);
    }

    return {
        "init":     init,
        "sendRead": sendRead,
        "sendSave": sendSave,
        "sendPrint": sendPrint,
        "email": email,
        "sendSendToKindle": sendSendToKindle,
        "sendSetupKindle": sendSetupKindle
    };

}());

/**
 * Ensure we have enough capability to handle embeds, should work in
 * IE8+, FF3.5+, Safari4+, iOS Safari 4+, Chrome, Android 2.1+
 * Inspired by Pareto Browser Filter by Filipe Fortes: http://www.fortes.com/2011/the-pareto-browser-filter
**/
if (document.querySelectorAll && window.postMessage && window.JSON) {
    /**
     * Bind on DOMContentLoaded if we have it, otherwise just onload.
     * We could be smarter here by doing the scroll hack, but I'm not sure it's worth the code overhead.
    **/
    if (document.readyState === "complete") {
        /* We were already ready - just init immediately. */
        window.rdbEmbedButtons.init();
    } else {
        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", window.rdbEmbedButtons.init, false);
            window.addEventListener("load", window.rdbEmbedButtons.init, false);
        } else if (document.attachEvent) {
            document.attachEvent("onreadystatechange", window.rdbEmbedButtons.init);
            window.attachEvent("onload", window.rdbEmbedButtons.init);
        }
    }
}