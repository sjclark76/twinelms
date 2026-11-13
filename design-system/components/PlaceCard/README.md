# PlaceCard

A white card for one place in the guide: an eatery, a highlight, a hike, a bike trail or a shop. The consumer provides one to three tags, the name (`h3`), one or two sentences in the hosts' voice, a meta block of address and hours (`nest-meta`, slate) and an optional link.

Keep descriptions short so translations stay short too. Addresses are never translated. Cards sit on cream in a grid that drops to one column on phones.

**Photo (optional):** a 3:2 image at the very top of the card (`nest-place-photo`), bleeding to the card edges with rounded top corners. Always give it alt text. Cards without a photo stay as they are.

**Links (optional):** a row of plain text links under the card (`nest-place-links`: "Website" or "Menu", and "Directions"). Each has a 44px tap target, opens in a new tab with `rel="noopener"`, and carries visually hidden "(opens in a new tab)" text (`nest-sr-only`). Directions are a plain Google Maps search link, never an embed.
