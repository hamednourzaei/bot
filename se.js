
  clickDepthIssues: [],
  readabilityIssues: [],
  accessibilityIssues: [],
  pageProfiles: [],
  keywordOpportunities: [],
  semanticKeywords: [],
  asks, limit) => {
  let active = 0;
  let index = 0;
  const results = [];
  const queue = [];

  
  };

  return new Promise((resolve) => {
    next();
    setInterval(() => {
      if (active === 0 && index >= tasks.length) resolve(results);
    }, 100);
  });
};

// بررسی اینکه آیا مسیر مجاز است (شامل زیرپوشه‌;
}

// تحلیل معنایی (LSI و Long-Tail Keywords)
function analyzeSemanticKeywords(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const text = $("body")
      .text()
      .toLowerCase()
      .replace(/[^\w\s]/g, "");
    const tokenizer = new natural.WordTokenizer();
    const words = tokenizer.tokenize(text);

    const tfidf = new natural.TfIdf();
    tfidf.addDocument(words);
    const lsiKeywords = [];
    tfidf
      .listTerms(0)
      .slice(0, 10)
      .forEach((term) => {
        if (term.tfidf > 0.1) {
          lsiKeywords.push(term.term);
          results.semanticKeywords.push({
            file: filePath,
            keyword: term.term,
            tfidf: term.tfidf.toFixed(2),
          });
        }
      });

    const ngramTokenizer = new natural.NGramTokenizer({ min: 2, max: 4 });
    const ngrams = ngramTokenizer.tokenize(text);
    const longTailKeywords = ngrams.filter(
      (ngram) => ngram.split(" ").length >= 2
    );
    longTailKeywords.slice(0, 5).forEach((ngram) => {
      results.keywordOpportunities.push({
        file: filePath,
        phrase: ngram,
        suggestion: `Consider optimizing for long-tail: "${ngram}"`,
      });
    });

    return lsiKeywords;
  } catch (error) {
    console.error(
      `Error analyzing semantic keywords in ${filePath}: ${error.message}`
    );
    return [];
  }
}

// تحلیل Core Web Vitals (شبیه‌سازی)
function analyzeCoreWebVitals(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const scripts = $("script[src]").length;
    const images = $("img[src]").length;
    const cssFiles = $('link[rel="stylesheet"]').length;

    const lcpEstimate = images * 100 + scripts * 50 + cssFiles * 30;
    if (lcpEstimate > 2500) {
      results.coreWebVitals.push({
        file: filePath,
        metric: "LCP",
        value: `${lcpEstimate}ms`,
        issue: "LCP > 2.5s, optimize images and scripts",
      });
    }

    const fidEstimate = scripts * 10;
    if (fidEstimate > 100) {
      results.coreWebVitals.push({
        file: filePath,
        metric: "FID",
        value: `${fidEstimate}ms`,
        issue: "FID > 100ms, reduce JavaScript execution",
      });
    }

    const clsEstimate = $("img:not([width]):not([height])").length * 0.1;
    if (clsEstimate > 0.1) {
      results.coreWebVitals.push({
        file: filePath,
        metric: "CLS",
        value: clsEstimate.toFixed(2),
        issue: "CLS > 0.1, set explicit dimensions for images",
      });
    }

    return { lcp: lcpEstimate, fid: fidEstimate, cls: clsEstimate };
  } catch (error) {
    console.error(
      `Error analyzing Core Web Vitals in ${filePath}: ${error.message}`
    );
    return { lcp: 0, fid: 0, cls: 0 };
  }
}

// بررسی لینک‌های شکسته
async function checkLinks(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const links = $("a[href]");
    const tasks = Array.from(links).map((link) => async () => {
      const href = $(link).attr("href");
      if (!href) return;

      try {
        if (href.startsWith("http")) {
          const response = await axios.head(href, { timeout: 5000 });
          if (response.status >= 400) {
            results.brokenLinks.push({
              file: filePath,
              link: href,
              status: `Broken (HTTP ${response.status})`,
            });
          }
          if (!href.startsWith("https")) {
            results.urlIssues.push({
              file: filePath,
              url: href,
              issue: "Non-HTTPS link detected",
            });
          }
        } else {
          const resolvedPath = path.resolve(path.dirname(filePath), href);
          if (!fs.existsSync(resolvedPath)) {
            results.brokenLinks.push({
              file: filePath,
              link: href,
              status: "Broken (Internal)",
            });
          }
        }
        if (href.includes("?") || href.length > 100) {
          results.urlIssues.push({
            file: filePath,
            url: href,
            issue: "Non-SEO-friendly URL",
          });
        }
      } catch (error) {
        results.brokenLinks.push({
          file: filePath,
          link: href,
          status: `Error: ${error.message}`,
        });
      }
    });

    await limitConcurrency(tasks, config.maxConcurrentRequests);
  } catch (error) {
    console.error(`Error checking links in ${filePath}: ${error.message}`);
  }
}

// بررسی ساختار هدینگ‌ها
function checkHeadings(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const headings = $("h1, h2, h3, h4, h5, h6");
    let lastLevel = 0;

    headings.each((index, element) => {
      const tag = element.tagName.toLowerCase();
      const level = parseInt(tag.replace("h", ""));
      const text = $(element).text().trim();

      if (tag === "h1" && $("h1").length > 1) {
        results.headingIssues.push({
          file: filePath,
          issue: `Multiple H1 tags found`,
          text,
        });
      }
      if (lastLevel && level > lastLevel + 1) {
        results.headingIssues.push({
          file: filePath,
          issue: `Incorrect heading order: ${tag} after h${lastLevel}`,
          text,
        });
      }
      lastLevel = level;
    });
  } catch (error) {
    console.error(`Error checking headings in ${filePath}: ${error.message}`);
  }
}

// بررسی متاتگ‌ها
function checkMetaTags(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const title = $("title").text();
    if (!title) {
      results.metaIssues.push({ file: filePath, issue: "Missing title tag" });
    } else if (title.length > 60 || title.length < 5) {
      results.metaIssues.push({
        file: filePath,
        issue: `Title length issue (${title.length} characters)`,
      });
    }

    const description = $('meta[name="description"]').attr("content");
    if (!description) {
      results.metaIssues.push({
        file: filePath,
        issue: "Missing meta description",
      });
    } else if (description.length > 160 || description.length < 20) {
      results.metaIssues.push({
        file: filePath,
        issue: `Meta description length issue (${description.length} characters)`,
      });
    }
  } catch (error) {
    console.error(`Error checking meta tags in ${filePath}: ${error.message}`);
  }
}

// بررسی تگ‌های Open Graph و Twitter Card
function checkSocialMetaTags(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const ogTitle = $('meta[property="og:title"]').attr("content");
    if (!ogTitle) {
      results.socialMetaIssues.push({
        file: filePath,
        issue: "Missing og:title tag",
      });
    }

    const ogDescription = $('meta[property="og:description"]').attr("content");
    if (!ogDescription) {
      results.socialMetaIssues.push({
        file: filePath,
        issue: "Missing og:description tag",
      });
    }

    const ogImage = $('meta[property="og:image"]').attr("content");
    if (!ogImage) {
      results.socialMetaIssues.push({
        file: filePath,
        issue: "Missing og:image tag",
      });
    }

    const twitterCard = $('meta[name="twitter:card"]').attr("content");
    if (!twitterCard) {
      results.socialMetaIssues.push({
        file: filePath,
        issue: "Missing twitter:card tag",
      });
    }
  } catch (error) {
    console.error(
      `Error checking social meta tags in ${filePath}: ${error.message}`
    );
  }
}

// بررسی تصاویر
function checkImages(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const images = $("img");
    images.each((index, element) => {
      const src = $(element).attr("src");
      const alt = $(element).attr("alt");
      if (!alt) {
        results.imageIssues.push({
          file: filePath,
          image: src,
          issue: "Missing alt text",
        });
      } else if (alt.length > 125) {
        results.imageIssues.push({
          file: filePath,
          image: src,
          issue: `Alt text too long (${alt.length} characters)`,
        });
      }
    });
  } catch (error) {
    console.error(`Error checking images in ${filePath}: ${error.message}`);
  }
}

// بررسی دسترسی‌پذیری
function checkAccessibility(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const images = $("img:not([alt])");
    if (images.length > 0) {
      results.accessibilityIssues.push({
        file: filePath,
        issue: `${images.length} images without alt attribute`,
      });
    }

    const links = $("a:not([aria-label]):not([title])");
    if (links.length > 0) {
      results.accessibilityIssues.push({
        file: filePath,
        issue: `${links.length} links without aria-label or title`,
      });
    }
  } catch (error) {
    console.error(
      `Error checking accessibility in ${filePath}: ${error.message}`
    );
  }
}

// تحلیل چگالی کلمات کلیدی و کشف فرصت‌ها
function checkKeywords(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const text = $("body")
      .text()
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const wordCount = {};
    text.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const totalWords = text.length;
    const keywords = [];
    for (const [word, count] of Object.entries(wordCount)) {
      const density = (count / totalWords) * 100;
      if (density > 3) {
        results.keywordIssues.push({
          file: filePath,
          word,
          density: density.toFixed(2),
          issue: "High keyword density",
        });
      }
      if (count > 2) keywords.push(word);
      if (count === 1 && word.length > 5) {
        results.keywordOpportunities.push({
          file: filePath,
          word,
          suggestion: `Consider using "${word}" more frequently`,
        });
      }
    }
    return keywords.slice(0, 5);
  } catch (error) {
    console.error(`Error checking keywords in ${filePath}: ${error.message}`);
    return [];
  }
}

// بررسی robots.txt
function checkRobotsTxt(domain) {
  try {
    const robotsPath = path.join(domain, "robots.txt");
    if (!fs.existsSync(robotsPath)) {
      results.robotsIssues.push({
        issue: `robots.txt file is missing in ${domain}`,
      });
      return;
    }
    const content = fs.readFileSync(robotsPath, "utf-8");
    if (content.includes("Disallow: /")) {
      results.robotsIssues.push({
        issue: `robots.txt blocks entire site in ${domain}`,
      });
    }
  } catch (error) {
    console.error(`Error checking robots.txt in ${domain}: ${error.message}`);
  }
}

// بررسی sitemap.xml
function checkSitemap(domain) {
  try {
    const sitemapPath = path.join(domain, "sitemap.xml");
    if (!fs.existsSync(sitemapPath)) {
      results.sitemapIssues.push({
        issue: `sitemap.xml file is missing in ${domain}`,
      });
      return;
    }
    const content = fs.readFileSync(sitemapPath, "utf-8");
    xml2js.parseString(content, (err, result) => {
      if (err) {
        results.sitemapIssues.push({
          issue: `Invalid sitemap.xml format in ${domain}`,
        });
        return;
      }
      const urls = result?.urlset?.url || [];
      urls.forEach((url) => {
        const loc = url.loc?.[0];
        if (loc && !loc.startsWith("http")) {
          results.sitemapIssues.push({
            url: loc,
            issue: "Invalid URL in sitemap (must be absolute)",
          });
        }
      });
    });
  } catch (error) {
    console.error(`Error checking sitemap.xml in ${domain}: ${error.message}`);
  }
}

// کشف محتوای تکراری با Jaccard
function checkDuplicateContent(filePath, content, allContents) {
  try {
    const $ = cheerio.load(content);
    const text = $("body")
      .text()
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const setA = new Set(text);
    for (const [otherPath, otherText] of Object.entries(allContents)) {
      if (otherPath === filePath) continue;
      const setB = new Set(otherText);
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      const similarity = intersection.size / union.size;

      if (similarity > 0.8) {
        results.duplicateContent.push({
          file: filePath,
          similarTo: otherPath,
          similarity: similarity.toFixed(2),
        });
      }
    }
    return text;
  } catch (error) {
    console.error(
      `Error checking duplicate content in ${filePath}: ${error.message}`
    );
    return [];
  }
}

// بررسی اسکیما
function checkSchema(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const jsonLd = $('script[type="application/ld+json"]');
    const microdata = $("[itemscope]");
    if (jsonLd.length === 0 && microdata.length === 0) {
      results.schemaIssues.push({
        file: filePath,
        issue: "No schema markup found",
      });
    }
  } catch (error) {
    console.error(`Error checking schema in ${filePath}: ${error.message}`);
  }
}

// تحلیل عمق کلیک
function calculateClickDepth(
  filePath,
  content,
  linkGraph,
  visited = new Set(),
  depth = 0,
  domain
) {
  try {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    if (depth > 3) {
      results.clickDepthIssues.push({
        file: filePath,
        depth,
        issue: "Page too deep from homepage",
      });
    }

    const $ = cheerio.load(content);
    const links = $("a[href]");
    links.each((_, link) => {
      const href = $(link).attr("href");
      if (!href || href.startsWith("http")) return;
      const resolvedPath = path.resolve(path.dirname(filePath), href);
      if (fs.existsSync(resolvedPath) && isAllowedPath(resolvedPath, domain)) {
        linkGraph[resolvedPath] = (linkGraph[resolvedPath] || 0) + 1;
      }
    });

    for (const nextPath of Object.keys(linkGraph)) {
      if (fs.existsSync(nextPath) && isAllowedPath(nextPath, domain)) {
        const nextContent = fs.readFileSync(nextPath, "utf-8");
        calculateClickDepth(
          nextPath,
          nextContent,
          linkGraph,
          visited,
          depth + 1,
          domain
        );
      }
    }
  } catch (error) {
    console.error(
      `Error calculating click depth in ${filePath}: ${error.message}`
    );
  }
}

// بررسی خوانایی برای فارسی
function checkReadability(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const text = $("body").text().trim();
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let longSentences = 0;
    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/).length;
      if (words > 20) longSentences++;
    });

    const readabilityScore = 100 - (longSentences / sentences.length) * 100;
    if (readabilityScore < 70) {
      results.readabilityIssues.push({
        file: filePath,
        score: readabilityScore.toFixed(2),
        issue: "Poor readability (too many long sentences)",
      });
    }
    return readabilityScore;
  } catch (error) {
    console.error(
      `Error checking readability in ${filePath}: ${error.message}`
    );
    return 0;
  }
}

// تولید پروفایل سئوی صفحه
function generatePageProfile(filePath, content) {
  try {
    const $ = cheerio.load(content);
    const keywords = checkKeywords(filePath, content);
    const semanticKeywords = analyzeSemanticKeywords(filePath, content);
    const vitals = analyzeCoreWebVitals(filePath, content);
    const errors = [
      ...results.brokenLinks.filter((i) => i.file === filePath),
      ...results.headingIssues.filter((i) => i.file === filePath),
      ...results.metaIssues.filter((i) => i.file === filePath),
      ...results.imageIssues.filter((i) => i.file === filePath),
      ...results.urlIssues.filter((i) => i.file === filePath),
      ...results.socialMetaIssues.filter((i) => i.file === filePath),
      ...results.duplicateContent.filter((i) => i.file === filePath),
      ...results.schemaIssues.filter((i) => i.file === filePath),
      ...results.clickDepthIssues.filter((i) => i.file === filePath),
      ...results.readabilityIssues.filter((i) => i.file === filePath),
      ...results.accessibilityIssues.filter((i) => i.file === filePath),
      ...results.coreWebVitals.filter((i) => i.file === filePath),
    ].length;

    const warnings = results.keywordIssues.filter(
      (i) => i.file === filePath
    ).length;
    const profile = {
      url: filePath,
      score: Math.max(0, 100 - errors * 5 - warnings * 2),
      errors,
      warnings,
      keywords,
      semanticKeywords,
      schema:
        $('script[type="application/ld+json"]').length > 0 ||
        $("[itemscope]").length > 0,
      meta: {
        titleLength: $("title").text().length,
        descriptionLength:
          $('meta[name="description"]').attr("content")?.length || 0,
      },
      coreWebVitals: vitals,
    };
    results.pageProfiles.push(profile);
  } catch (error) {
    console.error(
      `Error generating page profile for ${filePath}: ${error.message}`
    );
  }
}

// ذخیره تاریخچه اسکن
function saveScanHistory(domain) {
  try {
    const historyPath = path.join(
      config.outputDir,
      `scan-history-${domain.replace(/[^a-zA-Z0-9]/g, "_")}.json`
    );
    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath, "utf-8"))
      : [];
    history.push({
      timestamp: new Date().toISOString(),
      results: {
        brokenLinks: results.brokenLinks.length,
        duplicateContent: results.duplicateContent.length,
        accessibilityIssues: results.accessibilityIssues.length,
        keywordOpportunities: results.keywordOpportunities.length,
        coreWebVitalsIssues: results.coreWebVitals.length,
      },
    });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error(`Error saving scan history for ${domain}: ${error.message}`);
  }
}

// تولید گزارش PDF
function generatePDFReport(domain) {
  try {
    const doc = new PDFDocument({ margin: 50 });
    const pdfPath = path.join(
      config.outputDir,
      `seo-report-${domain.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}.pdf`
    );
    doc.pipe(fs.createWriteStream(pdfPath));

    doc
      .fontSize(20)
      .fillColor("darkblue")
      .text(`SEO Scan Report for ${domain}`, { align: "center" });
    doc.moveDown(2);

    const sections = [
      {
        title: "Broken Links",
        data: results.brokenLinks,
        fields: ["file", "link", "status"],
        color: "red",
      },
      {
        title: "Heading Issues",
        data: results.headingIssues,
        fields: ["file", "issue", "text"],
        color: "orange",
      },
      {
        title: "Meta Tag Issues",
        data: results.metaIssues,
        fields: ["file", "issue"],
        color: "orange",
      },
      {
        title: "Social Meta Issues",
        data: results.socialMetaIssues,
        fields: ["file", "issue"],
        color: "orange",
      },
      {
        title: "Image Issues",
        data: results.imageIssues,
        fields: ["file", "image", "issue"],
        color: "orange",
      },
      {
        title: "Accessibility Issues",
        data: results.accessibilityIssues,
        fields: ["file", "issue"],
        color: "purple",
      },
      {
        title: "URL Issues",
        data: results.urlIssues,
        fields: ["file", "url", "issue"],
        color: "orange",
      },
      {
        title: "Robots.txt Issues",
        data: results.robotsIssues,
        fields: ["issue"],
        color: "red",
      },
      {
        title: "Sitemap Issues",
        data: results.sitemapIssues,
        fields: ["url", "issue"],
        color: "red",
      },
      {
        title: "Keyword Issues",
        data: results.keywordIssues,
        fields: ["file", "word", "density", "issue"],
        color: "orange",
      },
      {
        title: "Keyword Opportunities",
        data: results.keywordOpportunities,
        fields: ["file", "word", "suggestion"],
        color: "green",
      },
      {
        title: "Semantic Keywords",
        data: results.semanticKeywords,
        fields: ["file", "keyword", "tfidf"],
        color: "green",
      },
      {
        title: "Core Web Vitals",
        data: results.coreWebVitals,
        fields: ["file", "metric", "value", "issue"],
        color: "purple",
      },
      {
        title: "Duplicate Content",
        data: results.duplicateContent,
        fields: ["file", "similarTo", "similarity"],
        color: "orange",
      },
      {
        title: "Schema Issues",
        data: results.schemaIssues,
        fields: ["file", "issue"],
        color: "orange",
      },
      {
        title: "Click Depth Issues",
        data: results.clickDepthIssues,
        fields: ["file", "depth", "issue"],
        color: "orange",
      },
      {
        title: "Readability Issues",
        data: results.readabilityIssues,
        fields: ["file", "score", "issue"],
        color: "purple",
      },
      {
        title: "Page Profiles",
        data: results.pageProfiles,
        fields: [
          "url",
          "score",
          "errors",
          "warnings",
          "keywords",
          "semanticKeywords",
          "schema",
          "meta",
          "coreWebVitals",
        ],
        color: "blue",
      },
    ];

    sections.forEach(({ title, data, fields, color }) => {
      doc.fontSize(14).fillColor(color).text(title, { underline: true });
      doc.moveDown(0.5);
      if (data.length === 0) {
        doc.fontSize(12).fillColor("black").text("No issues found.");
      } else {
        data.forEach((item) => {
          doc.fontSize(10).fillColor("black");
          fields.forEach((field) => {
            doc.text(
              `${field.charAt(0).toUpperCase() + field.slice(1)}: ${
                JSON.stringify(item[field]) || "N/A"
              }`,
              { indent: 20 }
            );
          });
          doc.moveDown(0.5);
        });
      }
      doc.moveDown();
    });

    doc.end();
    return pdfPath;
  } catch (error) {
    console.error(
      `Error generating PDF report for ${domain}: ${error.message}`
    );
    return null;
  }
}

// تولید داشبورد تعاملی (HTML)
function generateInteractiveDashboard(domain) {
  try {
    const dashboardPath = path.join(
      config.outputDir,
      `seo-dashboard-${domain.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}.html`
    );
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Dashboard - ${domain}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { text-align: center; color: #2c3e50; }
    canvas { max-width: 600px; margin: 20px auto; }
  </style>
</head>
<body>
  <h1>SEO Dashboard for ${domain}</h1>
  <canvas id="issuesChart"></canvas>
  <canvas id="vitalsChart"></canvas>
  <script>
    const issuesData = {
      labels: ['Broken Links', 'Meta Issues', 'Core Web Vitals', 'Keyword Issues'],
      datasets: [{
        label: 'Issues Count',
        data: [
          ${results.brokenLinks.length},
          ${results.metaIssues.length},
          ${results.coreWebVitals.length},
          ${results.keywordIssues.length}
        ],
        backgroundColor: ['#e74c3c', '#f39c12', '#8e44ad', '#3498db']
      }]
    };
    const vitalsData = {
      labels: ['LCP', 'FID', 'CLS'],
      datasets: [{
        label: 'Core Web Vitals (Avg)',
        data: [
          ${
            results.coreWebVitals
              .filter((v) => v.metric === "LCP")
              .reduce((sum, v) => sum + parseFloat(v.value), 0) /
            (results.coreWebVitals.filter((v) => v.metric === "LCP").length ||
              1)
          },
          ${
            results.coreWebVitals
              .filter((v) => v.metric === "FID")
              .reduce((sum, v) => sum + parseFloat(v.value), 0) /
            (results.coreWebVitals.filter((v) => v.metric === "FID").length ||
              1)
          },
          ${
            results.coreWebVitals
              .filter((v) => v.metric === "CLS")
              .reduce((sum, v) => sum + parseFloat(v.value), 0) /
            (results.coreWebVitals.filter((v) => v.metric === "CLS").length ||
              1)
          }
        ],
        backgroundColor: ['#9b59b6', '#3498db', '#e74c3c']
      }]
    };
    new Chart(document.getElementById('issuesChart'), {
      type: 'bar',
      data: issuesData,
      options: { scales: { y: { beginAtZero: true } } }
    });
    new Chart(document.getElementById('vitalsChart'), {
      type: 'bar',
      data: vitalsData,
      options: { scales: { y: { beginAtZero: true } } }
    });
  </script>
</body>
</html>
    `;
    fs.writeFileSync(dashboardPath, htmlContent);
    return dashboardPath;
  } catch (error) {
    console.error(`Error generating dashboard for ${domain}: ${error.message}`);
    return null;
  }
}

// رابط CLI تعاملی
async function runInteractiveCLI() {
  const answers = await inquirer.prompt([
    {
      type: "checkbox",
      name: "scans",
      message: "Which scans do you want to run?",
      choices: [
        "Broken Links",
        "Headings",
        "Meta Tags",
        "Social Meta Tags",
        "Images",
        "Accessibility",
        "URLs",
        "Robots.txt",
        "Sitemap",
        "Keywords",
        "Duplicate Content",
        "Schema",
        "Click Depth",
        "Readability",
        "Page Profiles",
        "Keyword Opportunities",
        "Semantic Keywords",
        "Core Web Vitals",
      ],
      default: ["Broken Links", "Headings", "Meta Tags", "Core Web Vitals"],
    },
    {
      type: "input",
      name: "domains",
      message:
        "Enter local paths (comma-separated, leave empty to use config):",
      default: config.domains.join(","),
    },
    {
      type: "confirm",
      name: "concurrent",
      message: "Run scans concurrently?",
      default: true,
    },
    {
      type: "confirm",
      name: "schedule",
      message: "Schedule daily scans?",
      default: false,
    },
  ]);

  return {
    scans: answers.scans,
    domains: answers.domains
      ? answers.domains.split(",").map((d) => d.trim())
      : config.domains,
    concurrent: answers.concurrent,
    schedule: answers.schedule,
  };
}

// اسکن یک دامنه یا پوشه
async function scanDomain(domain, scans) {
  let files = [];
  let allContents = {};

  try {
    // اسکن بازگشتی پوشه‌های src و public
    const allowedFolders = [
      path.join(domain, "src"),
      path.join(domain, "public"),
    ];
    files = [];
    allowedFolders.forEach((folder) => {
      if (fs.existsSync(folder)) {
        files.push(...scanFilesRecursively(folder));
      }
    });

    const tasks = files.map((file) => async () => {
      const stat = fs.statSync(file);

      if (!isAllowedPath(file, domain)) return;

      if (stat.isDirectory()) {
        await scanDomain(file, scans);
        return;
      }

      let content;
      try {
        content = fs.readFileSync(file, "utf-8");
      } catch (error) {
        console.error(`Error reading file ${file}: ${error.message}`);
        return;
      }

      const ext = path.extname(file).toLowerCase();
      console.log(`Scanning: ${file}`);

      if ([".html", ".htm"].includes(ext)) {
        if (scans.includes("Broken Links")) await checkLinks(file, content);
        if (scans.includes("Headings")) checkHeadings(file, content);
        if (scans.includes("Meta Tags")) checkMetaTags(file, content);
        if (scans.includes("Social Meta Tags"))
          checkSocialMetaTags(file, content);
        if (scans.includes("Images")) checkImages(file, content);
        if (scans.includes("Accessibility")) checkAccessibility(file, content);
        if (scans.includes("Duplicate Content"))
          allContents[file] = await checkDuplicateContent(
            file,
            content,
            allContents
          );
        if (scans.includes("Schema")) checkSchema(file, content);
        if (
          scans.includes("Page Profiles") ||
          scans.includes("Keyword Opportunities") ||
          scans.includes("Semantic Keywords") ||
          scans.includes("Core Web Vitals")
        ) {
          generatePageProfile(file, content);
        }
        if (scans.includes("Readability")) checkReadability(file, content);
      } else if ([".js", ".tsx", ".ts"].includes(ext)) {
        console.log(`JS/TS file detected: ${file} (Add custom logic here)`);
        // می‌توانید اینجا منطق خاصی برای تحلیل فایل‌های جاوااسکریپت/تایپ‌اسکریپت اضافه کنید
      }
    });

    await limitConcurrency(tasks, config.maxConcurrentRequests);

    if (scans.includes("Click Depth")) {
      const homepage = path.join(domain, "public", "index.html");
      if (fs.existsSync(homepage) && isAllowedPath(homepage, domain)) {
        const content = fs.readFileSync(homepage, "utf-8");
        calculateClickDepth(homepage, content, {}, new Set(), 0, domain);
      }
    }
    if (scans.includes("Robots.txt")) checkRobotsTxt(domain);
    if (scans.includes("Sitemap")) checkSitemap(domain);
  } catch (error) {
    console.error(`Error scanning domain ${domain}: ${error.message}`);
  }
}

// زمان‌بندی اسکن‌ها
function scheduleScans(domains, scans) {
  schedule.scheduleJob(config.schedule, async () => {
    console.log("Running scheduled SEO scan...");
    const domainTasks = domains.map((domain) => async () => {
      Object.keys(results).forEach((key) => (results[key] = []));
      await scanDomain(domain, scans);

      const jsonPath = path.join(
        config.outputDir,
        `seo-report-${domain.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}.json`
      );
      fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

      const pdfPath = generatePDFReport(domain);
      const dashboardPath = generateInteractiveDashboard(domain);
      saveScanHistory(domain);

      return { domain, jsonPath, pdfPath, dashboardPath };
    });

    const scanResults = await limitConcurrency(
      domainTasks,
      config.maxConcurrentRequests
    );

    console.log("Scheduled scan completed. Reports saved in:");
    scanResults.forEach(({ domain, jsonPath, pdfPath, dashboardPath }) => {
      console.log(`- ${domain}:`);
      console.log(`  JSON: ${jsonPath}`);
      if (pdfPath) console.log(`  PDF: ${pdfPath}`);
      if (dashboardPath) console.log(`  Dashboard: ${dashboardPath}`);
    });
  });
}

// اجرای اصلی
async function main() {
  console.log("Starting SEO scan...");
  const {
    scans,
    domains,
    concurrent,
    schedule: shouldSchedule,
  } = await runInteractiveCLI();

  config.maxConcurrentRequests = concurrent ? config.maxConcurrentRequests : 1;

  if (shouldSchedule) {
    scheduleScans(domains, scans);
    console.log(`Scheduled daily scans at ${config.schedule}`);
  }

  const domainTasks = domains.map((domain) => async () => {
    Object.keys(results).forEach((key) => (results[key] = []));
    await scanDomain(domain, scans);

    const jsonPath = path.join(
      config.outputDir,
      `seo-report-${domain.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}.json`
    );
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

    const pdfPath = generatePDFReport(domain);
    const dashboardPath = generateInteractiveDashboard(domain);
    saveScanHistory(domain);

    return { domain, jsonPath, pdfPath, dashboardPath };
  });

  const scanResults = await limitConcurrency(
    domainTasks,
    config.maxConcurrentRequests
  );

  console.log("Scan completed. Reports saved in:");
  scanResults.forEach(({ domain, jsonPath, pdfPath, dashboardPath }) => {
    console.log(`- ${domain}:`);
    console.log(`  JSON: ${jsonPath}`);
    if (pdfPath) console.log(`  PDF: ${pdfPath}`);
    if (dashboardPath) console.log(`  Dashboard: ${dashboardPath}`);
  });
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
});
