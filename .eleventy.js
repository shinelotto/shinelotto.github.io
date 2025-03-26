module.exports = function(eleventyConfig) {
  // 允许复制data文件夹
  eleventyConfig.addPassthroughCopy("data");
  
  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    }
  };
};