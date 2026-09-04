# Boundary data

`npm run map:fetch` writes `districts.geojson` and `states.geojson` here.

**These files must be committed to git.** Vercel serves them as static assets and
does not run the fetch script during a build. If they are missing, the map shows
its "run npm run map:fetch" message in production instead of a map.

Re-run the fetch and commit again after each decennial reapportionment, or any
time a court orders new district lines.
