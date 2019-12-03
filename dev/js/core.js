var currentBaseUrl = $(location).attr('href');
var argoApiUrl =
    'http://idb.services.dmtio.net/instances/cartoonnetwork-go-api/prod?q=NOT%20offline%3Atrue';
var liveHeader = 'www.cartoonnetwork.com+json; version=2';
var currentHeader = 'www.cartoonnetwork.com+json; version=2';
var devHeader = 'www.cartoonnetwork.com+json; version=1';
var recommendsUrl = '/recommends';
var showUrl = '/shows';
var statusUrl = '/user/show';
var likeUrl = '/user/choice';
var playlistUrl = '/playlist';
var showFeedUrl = '/episodeguide/json/?seriesTitleId=';

var showObject = [];
var likeArray = [];

var currentUID = '';

var serverAddress = [];

var serverStatus = '';
var currentServer = 0;
var serverPortUrl = ':5000/healthcheck';

var playlistObject = [];

var currentAuthState = false;

var currentUserIdInputValue = 'Returning User Id';

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX     Core Get Data  / Post Data        XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function getData(url, callback, method) {
    $.ajax({
        beforeSend: function(request) {
            request.setRequestHeader('Accept', currentHeader);
            request.setRequestHeader('Authentication', 'cngoapi');
        },
        dataType: 'json',
        method: method,
        url: url,
        success: function(data) {
            callback(null, data);
        },
        error: function(error) {
            callback(error, null);
        }
    });
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX          Load Shows Area              XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function loadShows(error, data) {
    /* clean up any onclick events */

    $('.showUtility').each(function() {
        $('.showUtility').off('click');
    });

    $('.showIcon').each(function() {
        $('.showIcon').off('click');
    });

    /* set some globals */

    showObject = data;
    var featuredString = '';
    var showsString = '';
    var colors = ['#ffeb00', '#ec008c', '#00aeef'];
    var currentColor = 0;
    var featuredCount = 0;
    var likeCount = 0;
    var likeString = '';

    /*loop over the data */
    for (i = 0; i < data.length; i++) {
        /* set a temporary liked variable */
        var showLiked = false;

        /* loop over like array to see if this show is on the list */

        /* make sure this isnt the load state of the page with no user */
        if (currentUID != '') {
            /* status code only show in case of a 500 error */
            if (!('statusCode' in likeArray)) {
                /* loop over the keys in the objects */
                for (var key in likeArray) {
                    /* if the key matches the current title id check its value */
                    if (key == data[i].seriestitleid) {
                        /* if the value is like set it in the show object, else set it to false */
                        if (likeArray[key] == 'like') {
                            showLiked = true;
                            likeCount++;
                        } else {
                            showLiked = false;
                        }
                    }
                }
            }
        } else {
            showLiked = false;
        }

        /* Time to draw out the shows area */

        /* build a temp string */
        var output =
            "<div class='showIconWrap'><div class='showIcon' stid='" +
            data[i].seriestitleid +
            "' sticky='" +
            showLiked +
            "'><div class='likeIcon ";

        /* check to see if this is a liked or 'sticky' show */
        if (!showLiked) {
            output += ' hide';
        }
        /* the array length is what is passed for the utility windows onclick event */
        output +=
            "'><span>+1</span></div><img src='" +
            data[i].characterheadsd +
            "' alt='" +
            data[i].shorttitle +
            "'></div><div class='showFeed' titleId='" +
            data[i].seriestitleid +
            "'><p>feed</p></div><div class='showUtility' arrayLocation='" +
            i +
            "'><p>...</p></div></div> ";

        /* put the output string onto the featured or normal shows list and only grab 8 featured shows */
        if (data[i].introwhitelistflag == 'true' && featuredCount < 8) {
            featuredString += output;
            featuredCount++;
        } else {
            showsString += output;
        }
    }

    /* Add the # of likes line to the like string */
    likeString = '<p>' + likeCount + ' Shows Liked </p>';

    /* Draw the code on the page */
    $('#featuredShows').html(featuredString);
    $('#allShows').html(showsString);
    $('#userLikes').html(likeString);

    /* loop over the show icons to put in the background color and the click event  */
    $('.showIcon').each(function() {
        var foo = $(this).attr('stid');
        var foo2 = $(this);
        $(this).click({ param1: foo, param2: foo2 }, likeShow);

        $(this).css('background', colors[currentColor]);

        if (currentColor == 2) {
            currentColor = 0;
        } else {
            currentColor++;
        }
    });

    /* loop over the show utility buttons and add the click event */

    $('.showUtility').each(function() {
        var foo = $(this).attr('arrayLocation');
        $(this).click({ param1: foo }, showMore);
    });

    $('.showFeed').each(function() {
        var foo = $(this).attr('titleId');
        $(this).click(function() {
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
                hideShowsFeed();
            } else {
                $('.showFeed').removeClass('selected');
                getData(
                    currentBaseUrl +
                        '/episodeguide/json/' +
                        foo +
                        '?modelToUse=videoFormat&size=5000&collections=&type=episode,clip',
                    showShowsFeed,
                    'GET'
                );
                $(this).addClass('selected');
            }
        });
    });
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX         Load Recommended Area         XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function loadRecommends(error, data) {
    /*Test JSON Data*/
    //json = '{"poster":{},"recommends":[{"deeplink":"cartoonnetwork://open?section=OnDemand&series=2011404&subsection=minisodes","link_image":"https://i.cdn.turner.com/v5cache/CARTOON/site/Images/i196/all-shows-recommended-minisodes_1467x434.jpg"},{"deeplink":"cartoonnetwork://play?&section=OnDemand&series=2064567&title=2094654","link_image":"https://i.cdn.turner.com/v5cache/CARTOON/site/Images/i196/all-shows-recommended-story-arc_1467x434.jpg"},{"deeplink":"cartoonnetwork://open?section=OnDemand&series=757073&subsection=episodes","link_image":"https://i.cdn.turner.com/v5cache/CARTOON/site/Images/i194/recommended_fpo2.jpg"}]}'
    //json = $.parseJSON(json);
    //data = json;
    html = $('#recommendedShows').html();
    /*Get the recommends data and create a html element for it*/
    for (var i = 0; i < data.recommends.length; i++) {
        html += "<a href='" + data.recommends[i].deeplink + "'>";
        html += "<img class='recommended' src='" + data.recommends[i].link_image + "'/>";
        html += '</a>';
    }
    /*Put the recommended data into the recommendedShows container*/
    $('#recommendedShows').html(html);
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX      Show More / Hide Show More       XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function showMore(event) {
    if ($(event.delegateTarget).hasClass('selected')) {
        hideshowMore();
    } else {
        /* clean up the selected class */
        $('.showUtility').each(function() {
            $(this).removeClass('selected');
        });
        $(event.delegateTarget).addClass('selected');
        var data = showObject[event.data.param1];

        /* put together the inner html , breaking it up to make it easy to read */

        var foo = '<div id="showsInformationWrap">';
        foo += '<img src="' + data.logo + '" class="showInfoLogo">';
        foo += '<h1>' + data.shorttitle + '</h1>';
        foo += '<ul>';
        foo +=
            '<li><p><a href="' +
            data.charactergroup +
            '" target="_blank">900x675</a> | <a href="' +
            data.characterhead +
            '" target="_blank">395x445</a> | <a href="' +
            data.characterheadsd +
            '" target="_blank">99x112</a></p></li>';
        foo += '<li><p><span>Add Show Id :</span> ' + data.adshowid + ' </p></li>';
        foo += '<li><p><span>Content Id :</span> ' + data.contentid + ' </p></li>';
        foo += '<li><p><span>Intro Whitelist :</span> ' + data.introwhitelistflag + ' </p></li>';
        foo += '<li><p><span>Mix Whitelist :</span> ' + data.mixwhitelistflag + ' </p></li>';
        foo +=
            '<li><p><span>Secondary Color :</span> ' +
            data.secondarycolor +
            ' <span class="colorSwatch" style="background:' +
            data.secondarycolor +
            '"></span></p></li>';
        foo += '<li><p><span>Sequence :</span> ' + data.sequence + ' </p></li>';
        foo += '<li><p><span>Series Title Id :</span> ' + data.seriestitleid + ' </p></li>';
        foo += '<li><p><span>User Sticky:</span> ' + data.usersticky + ' </p></li>';
        foo += '</ul>';

        /* check if the property has a featured video, if so , check for if theres video information */
        if (
            data.featuredobj != null &&
            data.featuredobj.isFeatured != null &&
            data.featuredobj.isFeatured != undefined
        ) {
            if (data.featuredobj.titleid != null && data.featuredobj.titleid != undefined) {
                foo += '<div id="featureOverride">';
                foo += '<p class="featureOverrideBanner">' + data.featuredobj.bannertext + '</p>';
                foo += '<img src="' + data.featuredobj.thumburl + '">';
                foo += '</div>';
                foo += '<ul>';
                foo += '<li><p><span>Line 1 :</span> ' + data.featuredobj.text_line1 + ' </p></li>';
                foo += '<li><p><span>Line 2 :</span> ' + data.featuredobj.text_line2 + ' </p></li>';
                foo +=
                    '<li><p><span>Feature Title Id:</span> ' +
                    data.featuredobj.titleid +
                    ' </p></li>';
                foo += '</ul>';
            } else {
                foo += '<ul><li><p>Default in app episode override</p></li></ul>';
            }
        }

        foo += '</div><div id="showsInformationClose">CLOSE</div>';

        /* draw the html */
        $('#showsInformation').html(foo);

        /* set the click even for the close button */
        $('#showsInformationClose').click(hideshowMore);

        /* show the show more box */
        $('#showsInformation').show();
    }
}

function hideshowMore() {
    /* clean up the click state */
    $('#showsInformationClose').off('click');

    /* hide the show more box */
    $('#showsInformation').hide();

    /* clean up the selected class */
    $('.showUtility').removeClass('selected');
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX         Load User Function            XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function loadNewUser() {
    /* get a new Id , flag it with ZZ so we know its a debugging id */
    currentUID = 'ZZ' + generateUUID();

    /* put the new id into the returning user id field */
    $('#uidInput').val(currentUID);

    /* load all the likes and shows */
    getData(currentBaseUrl + statusUrl + '/preference/' + currentUID, storeLikes, 'GET');
    getData(currentBaseUrl + showUrl + '/' + currentUID, loadShows, 'GET');
    getData(
        currentBaseUrl + playlistUrl + '/' + currentUID + '?auth=' + currentAuthState,
        buildPlaylist,
        'GET'
    );
    getData(
        currentBaseUrl + recommendsUrl + '/' + currentUID + '?auth=' + currentAuthState,
        loadRecommends,
        'GET'
    );

    /* turn on the userId display */
    $('#userId').html(currentUID);
    $('#userInfo').show();
}

function loadReturningUser() {
    var foo = $('#uidInput').val();
    if (foo != 'null' && foo != 'Returning User Id') {
        currentUID = $('#uidInput').val();

        /* load all the shows and likes */
        getData(currentBaseUrl + statusUrl + '/preference/' + currentUID, storeLikes, 'GET');
        getData(currentBaseUrl + showUrl + '/' + currentUID, loadShows, 'GET');
        getData(
            currentBaseUrl + playlistUrl + '/' + currentUID + '?auth=' + currentAuthState,
            buildPlaylist,
            'GET'
        );
        getData(
            currentBaseUrl + recommendsUrl + '/' + currentUID + '?auth=' + currentAuthState,
            loadRecommends,
            'GET'
        );

        /* turn on the userId display */
        $('#userId').html(currentUID);
        $('#userInfo').show();
    }
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX            Like Shows                 XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function likeShow(event) {
    var showId = event.data.param1;
    var foo = event.data.param2;

    /* Make sure theres a loaded user id */
    if (currentUID != '' && currentUID != 'Returning User Id') {
        if ($(foo).attr('sticky') == 'true') {
            getData(
                currentBaseUrl + likeUrl + '/neutral' + '/' + showId + '/' + currentUID,
                refreshData,
                'POST'
            );
        } else {
            getData(
                currentBaseUrl + likeUrl + '/like' + '/' + showId + '/' + currentUID,
                refreshData,
                'POST'
            );
        }
    }
}

function storeLikes(error, data) {
    /* seems odd to have this, but its a quick way to get back the data from the get function */

    likeArray = data;
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX         Utility Functions             XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function refreshData() {
    getData(currentBaseUrl + statusUrl + '/preference/' + currentUID, storeLikes, 'GET');
    getData(currentBaseUrl + showUrl + '/' + currentUID, loadShows, 'GET');
    getData(
        currentBaseUrl + playlistUrl + '/' + currentUID + '?auth=' + currentAuthState,
        buildPlaylist,
        'GET'
    );
    getData(
        currentBaseUrl + recommendsUrl + '/' + currentUID + '?auth=' + currentAuthState,
        loadRecommends,
        'GET'
    );

    hideShowsFeed();
    hideshowMore();
    hideepisodeMore();
}

function stringShorten(string, amount) {
    var shortString = jQuery.trim(string).substring(0, amount);

    if (typeof string !== 'undefined') {
        if (string.length > amount) {
            shortString += '...';
        }
    }

    return shortString;
}

function generateUUID() {
    /* get the date */
    var d = new Date().getTime();

    /* replace the x with math randoms based on date to create a random uuid */
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid;
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX          Health Check                 XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function formatHealthCheck(error, data) {
    if (error == null) {
        if ('status' in data) {
            /* make sure that status is ok */
            if (data.status == 'ok') {
                serverStatus +=
                    '<div class="node"><div class="status go"></div><p>Version: ' +
                    data.version +
                    '</p><p>' +
                    serverAddress[currentServer] +
                    '</p></div>';
                /* if status is not ok, log and report */
            } else {
                serverStatus +=
                    '<div class="node"><div class="status stop"></div><p>Version: error</p><p>' +
                    serverAddress[currentServer] +
                    '</p></div>';
                conosle.log('Error in Ajax Return :' + serverAddress[currentServer]);
                console.log(data);
            }
            /* if status does not exist */
        } else {
            serverStatus +=
                '<div class="node"><div class="status stop"></div><p>Version: error</p><p>' +
                serverAddress[currentServer] +
                '</p></div>';
            conosle.log('Error in Ajax Return :' + serverAddress[currentServer]);
            console.log(data);
        }
    } else {
        console.log(error);
        console.log('Ajax Failure : ' + serverAddress[currentServer]);
        serverStatus +=
            '<div class="node"><div class="status stop"></div><p>Version: error</p><p>' +
            serverAddress[currentServer] +
            '</p></div>';
    }

    $('#healthCheck').html(serverStatus);
    currentServer++;
}

function healthCheck() {
    $.getJSON(argoApiUrl, function(result) {
        for (var key in result) {
            serverAddress.push('http://' + result[key].ipaddress);
        }

        for (i = 0; i < serverAddress.length; i++) {
            getData(serverAddress[i] + serverPortUrl, formatHealthCheck, 'GET');
        }
    });
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX          Build Playlist               XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function buildPlaylist(error, data) {
    var onScreenCount = 0;
    var offScreenCount = 0;
    var onScreenString = '';
    var offScreenString = '';
    var editorialString = '';

    playlistObject = data;

    /*loop over the data */
    for (i = 0; i < data.length; i++) {
        /* build output, breaking it up to make it easier to read */

        var output = "<div class='episodeWrap'><div class='episode' style='border:4px solid ";

        /* add if for color */
        if (data[i].preference == 'editorial') {
            output += '#00AEEF';
        } else if (data[i].supereditorial) {
            output += '#EC008C';
        } else {
            output += '#ccc';
        }

        output += "'><img src='" + data[i].thumbnailurl + "'>";

        if (data[i].bannertext != null && data[i].bannertext != '') {
            output += "<div class='banner'>" + data[i].bannertext + '</div>';
        }

        /* add the like icon */

        /* status code only show in case of a 500 error */
        if (!('statusCode' in likeArray)) {
            /* loop over the keys in the objects */
            for (var key in likeArray) {
                /* if the key matches the current title id check its value */
                if (key == data[i].seriestitleid) {
                    /* if the value is like set it in the show object, else set it to false */
                    if (likeArray[key] == 'like') {
                        output += '<div class="showLikeIcon"></div>';
                    }
                }
            }
        }

        /* add auth or unauth */
        if (data[i].type != 'clip') {
            if (data[i].authtype == 'auth') {
                output += "<div class='episodeAuth'></div>";
            } else if (data[i].authtype == 'unauth') {
                output += "<div class='episodeUnAuth'></div>";
            }
        }

        output += "<p class='episodeTitle'>" + stringShorten(data[i].title, 25) + '</p>';
        output += "<p class='episodeSeries'>" + stringShorten(data[i].seriesname, 30) + '</p>';
        output += '<p><span>Premiere Date: </span><br>' + data[i].originalpremieredate + '</p>';
        output += '<p><span>PublishDate: </span><br>' + data[i].pubdate + '</p>';
        output += '<p><span>Type: </span>' + data[i].type + '</p></div>';

        output += "<div class='episodeUtility' arraylocation='" + i + "'><p>...</p></div></div>";

        if (onScreenCount < 10) {
            onScreenString += output;
            onScreenCount++;
        } else if (offScreenCount < 10) {
            offScreenString += output;
            offScreenCount++;
        }

        if (data[i].preference == 'editorial' || data[i].supereditorial) {
            editorialString += output;
        }
    }

    $('#playListEditorial').html('<h2>Editorials</h2>' + editorialString);
    $('#playListOnScreen').html('<h2>On Screen Episodes</h2>' + onScreenString);
    $('#playListOffScreen').html('<h2>Off Screen Episodes</h2>' + offScreenString);

    $('.episodeUtility').each(function() {
        foo = $(this).attr('arrayLocation');
        $(this).click({ param1: foo }, episodeMore);
    });
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX   Episdoe More / Hide Episode More    XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function episodeMore(event) {
    if ($(event.delegateTarget).hasClass('selected')) {
        hideepisodeMore();
    } else {
        /* clean up the selected class */
        $('.episodeUtility').each(function() {
            $(this).removeClass('selected');
        });
        $(event.delegateTarget).addClass('selected');
        var data = playlistObject[event.data.param1];

        /* put together the inner html , breaking it up to make it easy to read */

        var foo = '<div id="showsInformationWrap">';
        foo += '<img src="' + data.thumbnailurl + '" class="episodeThumbnail">';
        foo += '<h1>' + data.title + '</h1>';
        foo += '<h2>' + data.seriesname + '</h2>';
        foo += '<ul>';
        foo += '<li><p><span>Id :</span> ' + data.id + ' </p></li>';
        foo += '<li><p><span>Active :</span> ' + data.active + ' </p></li>';
        foo += '<li><p><span>Descritpion :</span> ' + data.description + ' </p></li>';
        foo += '<li><p><span>Freewheel Id :</span> ' + data.freewheelid + ' </p></li>';
        foo += '<li><p><span>Type :</span> ' + data.type + ' </p></li>';
        foo += '<li><p><span>Episode Number :</span> ' + data.episodenumber + ' </p></li>';
        foo += '<li><p><span>Segment Id :</span> ' + data.segmentid + ' </p></li>';
        foo += '<li><p><span>Rating Code :</span> ' + data.tvratingcode + ' </p></li>';
        foo += '<li><p><span>Series Title Id :</span> ' + data.seriestitleid + ' </p></li>';
        foo += '<li><p><span>Season Number :</span> ' + data.seasonnumber + ' </p></li>';
        foo +=
            '<li><p><span>Original Premiere Date :</span> ' +
            data.originalpremierdate +
            ' </p></li>';
        foo += '<li><p><span>Collection Id :</span> ' + data.collectionid + ' </p></li>';
        foo += '<li><p><span>Auth Type :</span> ' + data.authtype + ' </p></li>';
        foo += '<li><p><span>Expire Date :</span> ' + data.expdate + ' </p></li>';
        foo += '<li><p><span>SEO Url :</span> ' + data.seofriendlyurl + ' </p></li>';
        foo += '<li><p><span>Title Id :</span> ' + data.titleid + ' </p></li>';
        foo += '<li><p><span>Sponsored Flag :</span> ' + data.sponsoredflag + ' </p></li>';
        foo += '<li><p><span>Slate Id :</span> ' + data.slateid + ' </p></li>';
        foo += '</ul>';

        foo += '</div><div id="showsInformationClose">CLOSE</div>';

        /* draw the html */
        $('#showsInformation').html(foo);

        /* set the click even for the close button */
        $('#showsInformationClose').click(hideepisodeMore);

        /* show the show more box */
        $('#showsInformation').show();
    }
}

function hideepisodeMore() {
    /* clean up the click state */
    $('#showsInformationClose').off('click');

    /* hide the show more box */
    $('#showsInformation').hide();

    /* clean up the selected class */
    $('.episodeUtility').each(function() {
        $(this).removeClass('selected');
    });
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX         Toggle Authentication         XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function toggleAuth() {
    /* toggle Auth state and classes */
    currentAuthState = !currentAuthState;
    $('#authtype').toggleClass('auth');
    $('#authtype').toggleClass('unauth');

    /* toggle the html label */
    if (currentAuthState) {
        $('#authtype').html('Auth');
    } else {
        $('#authtype').html('Un-Auth');
    }

    /* safty check to make sure theres a user loaded before we refresh the data */
    if (currentUID != '') {
        refreshData();
    }
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX             Shows Tray                XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

function showShowsFeed(error, data) {
    $('#showsPlayListWrapper').show();

    var onScreenString = '';

    playlistObject = data;

    if (data.length <= 20) {
        var length = data.length;
    } else {
        var length = 20;
    }

    /*loop over the data */
    for (i = 0; i < length; i++) {
        /* build output, breaking it up to make it easier to read */

        var output =
            "<div class='episodeWrap'><div class='episode' style='border:4px solid #ccc;'><img src='" +
            data[i].thumbnailurl +
            "'>";

        if (data[i].bannertext != null && data[i].bannertext != '') {
            output += "<div class='banner'>" + data[i].bannertext + '</div>';
        }

        /* add auth or unauth */
        if (data[i].type != 'clip') {
            if (data[i].authtype == 'auth') {
                output += "<div class='episodeAuth'></div>";
            } else if (data[i].authtype == 'unauth') {
                output += "<div class='episodeUnAuth'></div>";
            }
        }

        output += "<p class='episodeTitle'>" + stringShorten(data[i].title, 25) + '</p>';
        output += "<p class='episodeSeries'>" + stringShorten(data[i].seriesname, 30) + '</p>';
        output += '<p><span>Premiere Date: </span><br>' + data[i].originalpremieredate + '</p>';
        output += '<p><span>PublishDate: </span><br>' + data[i].pubdate + '</p>';
        output += '<p><span>Type: </span>' + data[i].type + '</p></div></div>';

        onScreenString += output;
    }

    /* draw the output */
    $('#showsPlayListOnScreen').html(
        '<h2>' + data[0].seriesname + ' Episode Feed </h2>' + onScreenString
    );
    /* get the editorial video */

    getData(currentBaseUrl + '/featuredepisode/' + data[0].seriestitleid, showFeedEditorial, 'GET');
}

function hideShowsFeed() {
    $('#showsPlayListWrapper').hide();
    $('.showFeed').each(function() {
        $(this).removeClass('selected');
    });
}

function showFeedEditorial(error, data) {
    if (typeof data.title !== 'undefined') {
        /* build output, breaking it up to make it easier to read */

        var output =
            "<div class='episodeWrap'><div class='episode' style='border:4px solid #ccc;'><img src='" +
            data.thumbnailurl +
            "'>";

        if (data.bannertext != null && data.bannertext != '') {
            output += "<div class='banner'>" + data.bannertext + '</div>';
        }

        /* add auth or unauth */
        if (data.type != 'clip') {
            if (data.authtype == 'auth') {
                output += "<div class='episodeAuth'></div>";
            } else if (data.authtype == 'unauth') {
                output += "<div class='episodeUnAuth'></div>";
            }
        }

        output += "<p class='episodeTitle'>" + stringShorten(data.title, 25) + '</p>';
        output += "<p class='episodeSeries'>" + stringShorten(data.seriesname, 30) + '</p>';
        output += '<p><span>Premiere Date: </span><br>' + data.originalpremieredate + '</p>';
        output += '<p><span>PublishDate: </span><br>' + data.pubdate + '</p>';
        output += '<p><span>Type: </span>' + data.type + '</p></div></div>';

        $('#showsEditorial').html('<h2>' + data.seriesname + ' Editorial Override </h2>' + output);
    }
}

/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */
/*   XX                                       XX */
/*   XX         Startup Functions             XX */
/*   XX                                       XX */
/*   XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX */

$(document).ready(function() {
    /* set some onclicks */
    $('#newUser').click(loadNewUser);
    $('#returningBtn').click(loadReturningUser);
    $('#authtype').click(toggleAuth);
    $('#showsFeedClose').click(hideShowsFeed);

    /* Populate the Shows tray */
    getData(currentBaseUrl + showUrl, loadShows, 'GET');
    healthCheck();

    /* Clearing the input field text and populating it if its blank */
    $('#uidInput').focus(function() {
        currentUserIdInputValue = $('#uidInput').val();
        $('#uidInput').val('');
    });
    $('#uidInput').focusout(function() {
        if ($('#uidInput').val() == '') {
            $('#uidInput').val(currentUserIdInputValue);
        }
    });
});
