Storage Info, visualize Mongo's storage and indexes
===================================================

© 2012 10gen, the MongoDB Company

Authors: Andrea Lattuada

The commands used by this tool are currently EXPERIMENTAL and UNSUPPORTED.

USAGE
-----

To use the visualizers you need MongoDB 2.3.1 or above.

Start mongod with the following command line switches:
    --rest --jsonp
    --enableExperimentalStorageDetailsCmd
    --enableExperimentalIndexStatsCmd

NOTE: running mongod with this options is unsafe and should never be done in
production.

Open one of the following links with Chorme.

https://10gen-labs.github.com/mongo-storage-info/indexStats.html
https://10gen-labs.github.com/mongo-storage-info/diskStorage.html
https://10gen-labs.github.com/mongo-storage-info/pagesInRAM.html

ADDITIONAL
----------

If you'd like to report a bug or request a new feature,
please file an issue on our github repository
(you must be logged into github to do this):

https://github.com/10gen-labs/mongo-storage-info/issues/new
