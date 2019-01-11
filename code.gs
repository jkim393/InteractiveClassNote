// Sample gdoc: https://docs.google.com/document/d/1W4_Rx8sIiUVZhfkridFnK2NjeP44nEOiCAuqixZVQE8/edit

// To create a web app with the HTML service, the code must include a doGet() function that tells the script how to serve the page
// The function that tells the webapp which html file is used as template
// This function is also needed to separate css and client-side javascript from index.html
// Source: https://developers.google.com/apps-script/guides/html/best-practices#separate_html_css_and_javascript
function doGet(request) {
  return HtmlService.createTemplateFromFile('index').evaluate().setTitle('Interactive Note');
}
  
// Function that is used to link external files like CSS and JS with the main html file which is index.html
// The function basically grabs the content of the file and returns it to where it was called
function linkFile(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Function that accesses the google doc via its submitted url
function getHtml(formObject) {
  var formURL = formObject.myURL;
  var sourceDoc = DocumentApp.openByUrl(formURL);
  var body = sourceDoc.getBody();
  
  var images = ['<img alt="" src="https://lh3.googleusercontent.com/hubgUMe-yMf2OpldWCNcvDKcW9T5Gbw4cNbLVoGLir5P0XQA01fVlnANjEc_DAU7EH28CvYMM6OE5tFMQkoAgqteEfLkE2pH1qinbRjUJbujNMTXrgdt09kjW6uK2GXoonqY6dB5" style="width: 225.00px; height: 225.00px; margin-left: 0.00px; margin-top: 0.00px; transform: rotate(0.00rad) translateZ(0px); -webkit-transform: rotate(0.00rad) translateZ(0px);" title="">', 
  '<img alt="" src="https://lh4.googleusercontent.com/WDqE1rsZZhStkN0V1JD_C6l0w6VKRFnesQiMYnNaSAzYYDV37j2r7_IRyhassBd3bCTXwItxKx9M7ft9rJ3gb3LB-O3bF9sHC6sONlobONKsuOmxfIFtQpBx3knTGu1DMg7cKgHy" style="width: 243.50px; height: 243.50px; margin-left: 0.00px; margin-top: 0.00px; transform: rotate(0.00rad) translateZ(0px); -webkit-transform: rotate(0.00rad) translateZ(0px);" title="">']; // Images from the google doc
  return convertGoogleDocToHtml(body, images);  // Ji Hwan, why are you using global variables?  FV; I changed them JH -12/22/18
}

// Adapted from: https://github.com/oazabir/GoogleDoc2Html
// Function that returns the converted html
function convertGoogleDocToHtml(body, images) { //what is clean?; removed clean JH -12/22/18
  var numChildren = body.getNumChildren();
  var outputHTML = []; // Output html
  var counters = {qCounter:0, cCounter:1, eCounter:1, iCounter:0}; // qCounter: numofquestions; cCounter: numofchoices; eCounter: numofexplanations
  
  // Walk through all the child elements of the body.
  for (var i = 0; i < numChildren; i++) {
    var child = body.getChild(i);
    outputHTML.push(convertElementToHtml(child, images, counters));
  }
  var html = outputHTML.join('\r');
  return html;
}

// Recursive function that converts each element within the google doc structure into a html
function convertElementToHtml(element, images, counters) {
  var outputHTML = [];
  var openingTagHtml = "", closingTagHtml = "";
  // Base case1: h1 or p type
  if (element.getType() == DocumentApp.ElementType.PARAGRAPH) {
    if (element.getHeading() == DocumentApp.ParagraphHeading.HEADING1) {
      openingTagHtml = "<h1>", closingTagHtml = "</h1>";
    }
    else {
      openingTagHtml = "<p>", closingTagHtml = "</p>";
    }
    outputHTML.push(openingTagHtml);
  }
  // Base case2: actual text
  if (element.getType() == DocumentApp.ElementType.TEXT) {
    convertTextToHtml(element, outputHTML, counters);
  }
  // Base case3: image
  else if (element.getType() == DocumentApp.ElementType.INLINE_IMAGE) {
    convertImageToHtml(element, images, outputHTML, counters);
  }
  // Recursive part: if children exists (in <p> or <h1>)
  else {
    if (element.getNumChildren) {
      var numChildren = element.getNumChildren();

      // Walk through all the child elements of the doc.
      for (var i = 0; i < numChildren; i++) {
        var child = element.getChild(i);
        outputHTML.push(convertElementToHtml(child, images, counters));
      }
    }
    else {return "";} //no children
  }
  outputHTML.push(closingTagHtml);
  return outputHTML.join('');
}

// Function that processes and pushes actual text to output
// Currently, the function only takes only the first appearing text format within a paragraph.
// E.g. if a sentence starts with bold format, the entire sentence will be bold. 
// Potential fix will be using a for loop on indices array or recursion.
function convertTextToHtml(element, outputHTML, counters) {
  var text = element.getText(); // Gets the actual text of the element

  if(element.isBold()) { // Bold text type
    outputHTML.push('<b>' + text + '</b>');
  }
  else if(element.isItalic()) { // Italic text type
    outputHTML.push('<blockquote>' + text + '</blockquote>');
  }
  else if (text.trim().indexOf('http://') == 0 || text.trim().indexOf('https://') == 0) { // A http or https link
    if(text.trim().indexOf('https://www.youtube.com') == 0 || text.trim().indexOf('http://www.youtube.com') == 0){ // A youtube link
      var youtubeID = getYoutubeID(text.trim());
      outputHTML.push('<iframe src="https://www.youtube.com/embed/' + youtubeID + '"> </iframe>'); //embed in iframe
    } 
    else { // A normal link
      outputHTML.push('<a href="' + text + '" rel="nofollow">' + text + '</a>');
    }
  }
  else if (text.trim().indexOf('Q:') == 0) { // Question text
    outputHTML.push('<div>' + text.substring(2) +'<br>');
  }    
  else if (text.trim().indexOf('C:') == 0) { // Answer choice text
    if (text.trim().indexOf('C: *') == 0) { // Correct answer choice text
      outputHTML.push('<input type="radio" name="' + counters.qCounter + '" onclick="correct(' + counters.cCounter +')">' + text.substring(4));
    }
    else {
      outputHTML.push('<input type="radio" name="' + counters.qCounter + '" onclick="wrong(' + counters.cCounter +')">' + text.substring(2));
    }
    counters.cCounter += 1;
  }
  else if (text.trim().indexOf('E:') == 0) { // Explanation text
    outputHTML.push('<p style="display:none;" id="' + counters.eCounter + '">' + text.substring(2) + "</p>"  );
    counters.eCounter += 1;
  }
  else if (text.trim().indexOf('QE') == 0) { // Marker for the end of a question
    outputHTML.push('</div>' +'<br>');
  }
  else { // Text with no special format
    outputHTML.push(text);
  }

} // End of convertText function


// Function that converts image and pushes image to output
// Currently, the image can be accessed if the url of the image is linked to the image in google doc
function convertImageToHtml(element, images, outputHTML, counters)
{
  //outputHTML.push('<img src="'+element.getLinkUrl()+'" alt="Failed to display image">');
  outputHTML.push('\'' + images[counters.iCounter] + '\'');
  counters.iCounter += 1;
}

// Function to get id of youtube video for two most common types of youtube url: https://youtube.com/watch?v=ID or https://youtube.com/watch?v=ID&whatever else
// Potentially need to use regex to accommodate different types of urls
// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
function getYoutubeID(url){
  var videoID = "";
  var idStartPosition = 2 + url.indexOf('v=');
  var ampersandPosition = url.indexOf('&');
  if(ampersandPosition != -1) {
    videoID = url.substring(idStartPosition, ampersandPosition);
  }
  else {
    videoID = url.substring(idStartPosition);
  }
  return videoID;
}
