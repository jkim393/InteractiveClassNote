//function that tells the webapp which html file is used to render
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index'); //the name of html file w/o .html
}

//Sample gdoc: https://docs.google.com/document/d/1W4_Rx8sIiUVZhfkridFnK2NjeP44nEOiCAuqixZVQE8/edit

var formURL;
var doc;
var body;
var bodyText;
var qCounter=0; //counter for number of questions
var cCounter=1; //counter for number of choices
var eCounter=1; //counter for number of explanations

function processForm(formObject) {
  formURL = formObject.myURL;
  doc = DocumentApp.openByUrl(formURL);
  body = doc.getBody();
  bodyText = body.getText();
  return ConvertGoogleDocToCleanHtml();  // Ji Hwan, why are you using global variables?  FV
}

//from: https://github.com/oazabir/GoogleDoc2Html
function ConvertGoogleDocToCleanHtml() { //what is clean?
  //var body = DocumentApp.getActiveDocument().getBody();
  var numChildren = body.getNumChildren();
  var output = []; //output html
  var images = []; //images from the source
  var listCounters = {};

  // Walk through all the child elements of the body.
  for (var i = 0; i < numChildren; i++) {
    var child = body.getChild(i);
    output.push(processItem(child, listCounters, images));
  }

  var html = output.join('\r');
  return html;
  //emailHtml(html, images);
  //createDocumentForHtml(html, images);
}

function dumpAttributes(atts) {
  // Log the paragraph attributes.
  for (var att in atts) {
    Logger.log(att + ":" + atts[att]);
  }
}

function processItem(item, listCounters, images) {
  var output = [];
  var prefix = "", suffix = "";

  if (item.getType() == DocumentApp.ElementType.PARAGRAPH) {
    switch (item.getHeading()) {
        // Add a # for each heading level. No break, so we accumulate the right number.
      case DocumentApp.ParagraphHeading.HEADING6: 
        prefix = "<h6>", suffix = "</h6>"; break;
      case DocumentApp.ParagraphHeading.HEADING5: 
        prefix = "<h5>", suffix = "</h5>"; break;
      case DocumentApp.ParagraphHeading.HEADING4:
        prefix = "<h4>", suffix = "</h4>"; break;
      case DocumentApp.ParagraphHeading.HEADING3:
        prefix = "<h3>", suffix = "</h3>"; break;
      case DocumentApp.ParagraphHeading.HEADING2:
        prefix = "<h2>", suffix = "</h2>"; break;
      case DocumentApp.ParagraphHeading.HEADING1:
        prefix = "<h1>", suffix = "</h1>"; break;
      default: 
        prefix = "<p>", suffix = "</p>";
    }

    if (item.getNumChildren() == 0)
      return "";
  }
  else if (item.getType() == DocumentApp.ElementType.INLINE_IMAGE)
  {
    processImage(item, images, output);
  }
  else if (item.getType()===DocumentApp.ElementType.LIST_ITEM) {
    var listItem = item;
    var gt = listItem.getGlyphType();
    var key = listItem.getListId() + '.' + listItem.getNestingLevel();
    var counter = listCounters[key] || 0;

    // First list item
    if ( counter == 0 ) {
      // Bullet list (<ul>):
      if (gt === DocumentApp.GlyphType.BULLET
          || gt === DocumentApp.GlyphType.HOLLOW_BULLET
          || gt === DocumentApp.GlyphType.SQUARE_BULLET) {
        prefix = '<ul class="small"><li>', suffix = "</li>";

          suffix += "</ul>";
        }
      else {
        // Ordered list (<ol>):
        prefix = "<ol><li>", suffix = "</li>";
      }
    }
    else {
      prefix = "<li>";
      suffix = "</li>";
    }

    if (item.isAtDocumentEnd() || item.getNextSibling().getType() != DocumentApp.ElementType.LIST_ITEM) {
      if (gt === DocumentApp.GlyphType.BULLET
          || gt === DocumentApp.GlyphType.HOLLOW_BULLET
          || gt === DocumentApp.GlyphType.SQUARE_BULLET) {
        suffix += "</ul>";
      }
      else {
        // Ordered list (<ol>):
        suffix += "</ol>";
      }

    }

    counter++;
    listCounters[key] = counter;
  }

  output.push(prefix);

  if (item.getType() == DocumentApp.ElementType.TEXT) {
    processText(item, output);
  }
  else {


    if (item.getNumChildren) {
      var numChildren = item.getNumChildren();

      // Walk through all the child elements of the doc.
      for (var i = 0; i < numChildren; i++) {
        var child = item.getChild(i);
        output.push(processItem(child, listCounters, images));
      }
    }

  }

  output.push(suffix);
  return output.join('');
}


function processText(item, output) {
  var text = item.getText();
  var indices = item.getTextAttributeIndices();

  if (indices.length <= 1) {
    // Assuming that a whole para fully italic is a quote
    if(item.isBold()) {
      output.push('<b>' + text + '</b>');
    }
    else if(item.isItalic()) {
      output.push('<blockquote>' + text + '</blockquote>');
    }
    else if (text.trim().indexOf('http://') == 0) {
      output.push('<a href="' + text + '" rel="nofollow">' + text + '</a>');
    }
    else if (text.trim().indexOf('Q:') == 0) { //special elements contain it in its own block
      output.push('<div>' + text.substring(2) +'<br>');
    }    
    else if (text.trim().indexOf('C:') == 0) {
      var s = "";
      s += cCounter;
      if (text.trim().indexOf('C: *') == 0) {
        output.push('<input type="radio" name="' + qCounter + '" onclick="correct(' + cCounter +')">' + text.substring(4));
      }
      else {
        output.push('<input type="radio" name="' + qCounter + '" onclick="wrong(' + cCounter +')">' + text.substring(2));
      }
      cCounter += 1;
    }
    else if (text.trim().indexOf('E:') == 0) {
      var s = "";
      s += eCounter;
      output.push('<p style="display:none;" id="' + s + '">' + text.substring(2) + "</p>"  );
      eCounter += 1;
    }
    else if (text.trim().indexOf('QE') == 0) {
      output.push('</div>' +'<br>');
    }
    else {
      output.push(text);
    }
  }
  else {

    for (var i=0; i < indices.length; i ++) {
      var partAtts = item.getAttributes(indices[i]);
      var startPos = indices[i];
      var endPos = i+1 < indices.length ? indices[i+1]: text.length;
      var partText = text.substring(startPos, endPos);

      Logger.log(partText);

      if (partAtts.ITALIC) {
        output.push('<i>');
      }
      if (partAtts.BOLD) {
        output.push('<b>');
      }
      if (partAtts.UNDERLINE) {
        output.push('<u>');
      }

      // If someone has written [xxx] and made this whole text some special font, like superscript
      // then treat it as a reference and make it superscript.
      // Unfortunately in Google Docs, there's no way to detect superscript
      if (partText.indexOf('[')==0 && partText[partText.length-1] == ']') {
        output.push('<sup>' + partText + '</sup>');
      }
      else if (partText.trim().indexOf('http://') == 0) {
        output.push('<a href="' + partText + '" rel="nofollow">' + partText + '</a>');
      }
      else {
        output.push(partText);
      }

      if (partAtts.ITALIC) {
        output.push('</i>');
      }
      if (partAtts.BOLD) {
        output.push('</b>');
      }
      if (partAtts.UNDERLINE) {
        output.push('</u>');
      }

    }
  }
}


function processImage(item, images, output)
{
  images = images || [];
  var blob = item.getBlob();
  var contentType = blob.getContentType();
  var extension = "";
  if (/\/png$/.test(contentType)) {
    extension = ".png";
  } else if (/\/gif$/.test(contentType)) {
    extension = ".gif";
  } else if (/\/jpe?g$/.test(contentType)) {
    extension = ".jpg";
  } else {
    throw "Unsupported image type: "+contentType;
  }
  var imagePrefix = "Image_";
  var imageCounter = images.length;
  var name = imagePrefix + imageCounter + extension;
  imageCounter++;
  output.push('<img src="cid:'+name+'" />');
  images.push( {
    "blob": blob,
    "type": contentType,
    "name": name});
}
