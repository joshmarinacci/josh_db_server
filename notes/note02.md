# 2022 July 7th

The next step is to process these bookmarks so that you can search through them. That
means downloading the URL's content and processing it in some way to extract the title
and an excerpt. To start I'm going to use an older Mozilla library 
called [Readability](https://www.npmjs.com/package/@mozilla/readability#nodejs-usage).

I started with a set of test URLs, a few home pages, some news articles, a github project, 
and a tweet. Starting with a set of test urls I ran them all through JSDOM and Readability. 
All returned something useful except for the Tweet which just says
'Something went wrong, but don’t fret — let’s give it another shot'.  I'm pretty sure Twitter
pages require JS to run for any actual content to appear, clearly intentional on Twitter's
part. Good enough for now.

Now to hook it up. Every time a document comes into the main server which need to pick it up,
process it, and insert_from_disk a new document with the parsed content. After fixing some settings
on the typescript compiler I have it all working.  I moved all of the code that handles the disk
into a DB class and added unit tests. Now when the processor is invoked it will grab the first
unprocessed item from the queue, scan it, and insert a new item which supersedes the old one.  The
DB will properly skip superseded items, but still lets them remain in the append only database on
disk.




