const lorem =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Justo nec ultrices dui sapien eget mi proin. Semper viverra nam libero justo laoreet. Habitant morbi tristique senectus et. Commodo nulla facilisi nullam vehicula ipsum a arcu cursus vitae. Nulla facilisi etiam dignissim diam. Quisque non tellus orci ac auctor augue. Orci sagittis eu volutpat odio facilisis. Ultricies integer quis auctor elit sed vulputate. Mattis rhoncus urna neque viverra. Platea dictumst quisque sagittis purus sit amet. Sagittis vitae et leo duis ut diam quam. Amet massa vitae tortor condimentum lacinia quis. Odio pellentesque diam volutpat commodo. Dolor sit amet consectetur adipiscing elit ut aliquam purus. Hendrerit gravida rutrum quisque non tellus orci ac auctor augue.";

const words = lorem
    .replace(".", "")
    .replace(",", "")
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length >= 5);

export function getKeyword() {
    // Return random item from array of words
    return words[Math.floor(Math.random() * words.length)];
}
