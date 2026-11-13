# VisitorMap

The world map of where guests come from. Golden `nest-pin`s mark guests' home towns; the single clay `nest-pin-home` marks The Nest. A white stat pill sits top left, and tapping a pin shows a `nest-pin-label` with the town and visit count.

The real map uses Leaflet with OpenStreetMap tiles, styled toward lake-mist water and fern land. The form below it asks for a town only, says plainly what is shown, and uses the warm button: the one clay action on that screen.

In the built page the stat pill sits top left and the zoom buttons top right, so they never overlap. The town field suggests towns as the guest types (an accessible combobox: arrow keys, Enter, Escape), using Photon through our own Worker; Nominatim's usage policy doesn't allow search-as-you-type, so it is only used to confirm the chosen town. A "See the list of towns" disclosure under the map gives screen-reader users the same information as the pins.
