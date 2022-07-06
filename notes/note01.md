I've started a few small projects as part of a larger initiative. 
As part of this I’m trying to do updates of my research every day. 
This means both documenting what I do and also *sharing* it (maybe in
brief) form. 

Today I started on a webbrowser bookmarks manager. The goal is to have a central
database of every page I bookmark. It is searchable both by the title and domain, but
also the content of the page itself. It could even keep a cached copy, or at least
a nice thumbnail of it.

Since I plan to actually use this I need something simple and hackable. I started 
the storage as an append only database on disk. It's literally a directory full
of JSON files. This took only a few tens of lines of typescript and it's
not really optimized yet. It took a bit more than an hour to build, complete
with kiddo distractions. I'd say that's pretty good.

The repo is here

Next I'll add a post processor that will try to extract useful data from the bookmarks,
including, in order of increasing difficulty.

* title
* one sentence description
* one paragraph description
* metadata images (if any)
* screenshot
* full content text of the website
* full renderably copy of the website

