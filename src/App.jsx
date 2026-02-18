import {
  Typography,
  Unstable_Grid2 as Grid,
  Link,
  Slider,
  TextField,
  Button,
  ButtonGroup,
  Switch,
  Snackbar,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  KeyboardArrowUp,
  KeyboardArrowDown,
  ContentCopyTwoTone,
  DownloadTwoTone,
  GitHub,
} from "@mui/icons-material";
import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { FastAverageColor } from "fast-average-color";
import characters from "./characters.json";
import Canvas from "./components/Canvas";
import Picker from "./components/Picker";
import ThemeWrapper from "./components/ThemeWrapper";

const Info = lazy(() => import("./components/Info"));

const fac = new FastAverageColor();

function desaturateColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === r / 255) h = (g / 255 - b / 255) / d + (g < b ? 6 : 0);
    else if (max === g / 255) h = (b / 255 - r / 255) / d + 2;
    else h = (r / 255 - g / 255) / d + 4;
    h /= 6;
  }

  s *= 0.15;
  l = Math.max(0.12, l * 0.3);

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r2 = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g2 = Math.round(hue2rgb(p, q, h) * 255);
  const b2 = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${r2.toString(16).padStart(2, '0')}${g2.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
}

function App() {
  const [infoOpen, setInfoOpen] = useState(false);
  const [copyPopupOpen, setCopyPopupOpen] = useState(false);
  const [downloadPopupOpen, setDownloadPopupOpen] = useState(false);
  const [dominantColor, setDominantColor] = useState("#3f50b5");
  const [backgroundColor, setBackgroundColor] = useState("#212121");
  const [character, setCharacter] = useState(49);
  const [text, setText] = useState(characters[character].defaultText.text);
  const [position, setPosition] = useState({
    x: characters[character].defaultText.x,
    y: characters[character].defaultText.y,
  });
  const [fontSize, setFontSize] = useState(characters[character].defaultText.s);
  const [spaceSize, setSpaceSize] = useState(1);
  const [rotate, setRotate] = useState(characters[character].defaultText.r);
  const [curve, setCurve] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imgObj, setImgObj] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    setText(characters[character].defaultText.text);
    setPosition({
      x: characters[character].defaultText.x,
      y: characters[character].defaultText.y,
    });
    setRotate(characters[character].defaultText.r);
    setFontSize(characters[character].defaultText.s);
    setLoaded(false);
    setImgObj(null);

    const img = new Image();
    img.src = "/img/" + characters[character].img;
    img.onload = () => {
      const color = fac.getColor(img, { algorithm: "sqrt" });
      setDominantColor(color.hex);
      setBackgroundColor(desaturateColor(color.hex));
      setImgObj(img);
      setLoaded(true);
    };
  }, [character]);

  const angle = useMemo(() => (Math.PI * text.length) / 7, [text]);

  const draw = useCallback((ctx) => {
    const w = 296;
    const h = 256;
    if (ctx.canvas.width !== w) ctx.canvas.width = w;
    if (ctx.canvas.height !== h) ctx.canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    if (loaded && imgObj && document.fonts.check("12px YurukaStd")) {
      const img = imgObj;

      const hRatio = w / img.width;
      const vRatio = h / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (w - img.width * ratio) / 2;
      const centerShift_y = (h - img.height * ratio) / 2;

      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        centerShift_x,
        centerShift_y,
        img.width * ratio,
        img.height * ratio
      );

      ctx.font = `${fontSize}px YurukaStd, SSFangTangTi`;
      ctx.lineWidth = 9;
      ctx.save();

      ctx.translate(position.x, position.y);
      ctx.rotate(rotate / 10);
      ctx.textAlign = "center";
      ctx.strokeStyle = "white";
      ctx.fillStyle = characters[character].color;

      const lines = text.split("\n");

      if (curve) {
        for (let line of lines) {
          for (let i = 0; i < line.length; i++) {
            ctx.rotate(angle / line.length / 2.5);
            ctx.save();
            ctx.translate(0, -1 * fontSize * 3.5);
            ctx.strokeText(line[i], 0, 0);
            ctx.fillText(line[i], 0, 0);
            ctx.restore();
          }
        }
      } else {
        for (let i = 0, k = 0; i < lines.length; i++) {
          ctx.strokeText(lines[i], 0, k);
          ctx.fillText(lines[i], 0, k);
          k += spaceSize;
        }
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "#212121";
      ctx.fillRect(0, 0, w, h);
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(
        "Pick a character to start ↘️",
        w / 2,
        h - 10
      );
    }
  }, [loaded, imgObj, fontSize, character, position, rotate, text, curve, angle, spaceSize]);

  const download = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${characters[character].name}_prsk.erica.moe.png`;
    link.href = canvas.toDataURL();
    link.click();
    setDownloadPopupOpen(true);
  }, [character]);

  const copy = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await navigator.clipboard.write([
      new window.ClipboardItem({
        "image/png": new Promise((resolve) => canvas.toBlob(resolve, "image/png")),
      }),
    ]);
    setCopyPopupOpen(true);
  }, []);

  const handleInfoOpen = useCallback(() => setInfoOpen(true), []);
  const handleInfoClose = useCallback(() => setInfoOpen(false), []);
  const handleCopyPopupClose = useCallback(() => setCopyPopupOpen(false), []);
  const handleDownloadPopupClose = useCallback(() => setDownloadPopupOpen(false), []);

  const handleCurveChange = useCallback((e) => {
    setCurve(e.target.checked);
    setPosition({
      x: 100,
      y: 150,
    });
  }, []);

  const handleTextChange = useCallback((e) => setText(e.target.value), []);
  const handleRotateChange = useCallback((_, v) => setRotate(v), []);
  const handleFontSizeChange = useCallback((_, v) => setFontSize(v), []);
  const handleSpaceSizeChange = useCallback((_, v) => setSpaceSize(v), []);

  const handleHorizontalPositionChange = useCallback((_, v) =>
    setPosition(prev => ({ ...prev, x: v })), []);

  const handleVerticalPositionChange = useCallback((_, v) =>
    setPosition(prev => ({
      ...prev,
      y: curve ? 256 + fontSize * 3 - v : 256 - v
    })), [curve, fontSize]);

  return (
    <ThemeWrapper dominantColor={dominantColor} backgroundColor={backgroundColor}>
      <Grid
        container
        disableEqualOverflow
        direction="column"
        justifyContent="space-evenly"
        sx={{ minHeight: "100vh", width: "100%", px: { xs: 1.5, sm: 3 } }}
      >
        <Grid justifyContent="center">
          <Typography
            variant="h3"
            align="center"
            sx={{
              fontFamily: "YurukaStd",
              fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            Project Sekai Stickers Maker
          </Typography>
          <Typography variant="subtitle1" align="center">
            Created by{" "}
            <Link
              sx={{ color: dominantColor }}
              onClick={handleInfoOpen}
              href="#"
            >
              Ayaka and others
            </Link>
            , tweaked by{" "}
            <Link
              sx={{ color: dominantColor }}
              href="https://erica.moe/@er1kaceae"
              target="_blank"
            >
              @er1kaceae@erica.moe
            </Link>
            .
          </Typography>
          <Typography align="center" sx={{ mt: 0.5 }}>
            <Button
              variant="outlined"
              startIcon={<GitHub />}
              href="https://github.com/BedrockDigger/sekai-stickers"
              target="_blank"
              sx={{
                color: dominantColor,
                padding: "2px 8px",
                height: "24px",
              }}
              size="small"
            >
              Star on GitHub
            </Button>
          </Typography>
        </Grid>
        <Grid container xs={12} justifyContent="space-evenly">
          <Grid container direction="column" xs={12} sm={7} md={5}>
            <Grid container>
              <Grid
                container
                xs={9}
                sm={10}
                justifyContent="space-evenly"
                alignItems="space-evenly"
              >
                <Grid
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Canvas
                    ref={canvasRef}
                    draw={draw}
                    style={{
                      border: "1px solid #eeeeee",
                      borderRadius: "10px",
                    }}
                  />
                </Grid>
              </Grid>
              <Grid
                container
                justifyContent="start"
                alignItems="center"
                direction="column"
                xs={3}
                sm={2}
              >
                <Grid
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <KeyboardArrowUp />
                </Grid>
                <Grid
                  sx={{
                    height: "80%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Tooltip title="move text vertically" placement="right">
                    <Slider
                      value={
                        curve
                          ? 256 - position.y + fontSize * 3
                          : 256 - position.y
                      }
                      onChange={handleVerticalPositionChange}
                      min={0}
                      max={256}
                      step={1}
                      orientation="vertical"
                      track={false}
                      sx={{ color: dominantColor }}
                      size="small"
                    />
                  </Tooltip>
                </Grid>
                <Grid
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <KeyboardArrowDown />
                </Grid>
              </Grid>
              <Grid
                xs={1}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <KeyboardArrowLeft />
              </Grid>
              <Grid
                xs={8}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Tooltip title="move text horizontally">
                  <Slider
                    value={position.x}
                    onChange={handleHorizontalPositionChange}
                    min={0}
                    max={296}
                    step={1}
                    track={false}
                    sx={{ color: dominantColor }}
                    size="small"
                  />
                </Tooltip>
              </Grid>
              <Grid
                xs={1}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <KeyboardArrowRight />
              </Grid>
              <Grid
                xs={2}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Picker setCharacter={setCharacter} color={dominantColor} />
              </Grid>
            </Grid>
          </Grid>
          <Grid
            sm={0}
            md={1}
            sx={{
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Divider orientation="vertical" />
          </Grid>
          <Grid
            container
            xs={12}
            sm={5}
            md={6}
            justifyContent="center"
            alignItems="center"
          >
            <Grid
              item
              xs={10}
              sx={{
                display: "flex",
                justifyContent: "left",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                fontFamily="YurukaStd"
                sx={{ flexShrink: 0, mr: 2, whiteSpace: "nowrap" }}
              >
                Rotation
              </Typography>
              <Slider
                value={rotate}
                onChange={handleRotateChange}
                min={-10}
                max={10}
                step={0.2}
                track={false}
                sx={{ color: dominantColor }}
              />
            </Grid>
            <Grid
              item
              xs={10}
              sx={{
                display: "flex",
                justifyContent: "left",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                fontFamily="YurukaStd"
                sx={{ flexShrink: 0, mr: 2, whiteSpace: "nowrap" }}
              >
                Font size
              </Typography>
              <Slider
                value={fontSize}
                onChange={handleFontSizeChange}
                min={10}
                max={100}
                step={1}
                track={false}
                sx={{ color: dominantColor }}
              />
            </Grid>
            <Grid
              item
              xs={10}
              sx={{
                display: "flex",
                justifyContent: "left",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                fontFamily="YurukaStd"
                sx={{ flexShrink: 0, mr: 2, whiteSpace: "nowrap" }}
              >
                Spacing
              </Typography>
              <Slider
                value={spaceSize}
                onChange={handleSpaceSizeChange}
                min={18}
                max={100}
                step={1}
                track={false}
                sx={{ color: dominantColor }}
              />
            </Grid>
            <Grid
              item
              xs={10}
              sx={{
                display: "flex",
                justifyContent: "left",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                fontFamily="YurukaStd"
                sx={{ flexShrink: 0, mr: 2, whiteSpace: "nowrap" }}
              >
                Curved text?
              </Typography>
              <Switch
                checked={curve}
                onChange={handleCurveChange}
                sx={{ color: dominantColor }}
              />
            </Grid>
            <Grid item xs={10} sx={{ pt: 1 }}>
              <TextField
                label="(multiline) text"
                size="small"
                sx={{ color: dominantColor }}
                value={text}
                multiline
                fullWidth
                onChange={handleTextChange}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid
          xs={12}
          item
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: { xs: 1, sm: 1.5 },
          }}
        >
          <ButtonGroup size="large">
            <Button
              variant="outlined"
              onClick={copy}
              startIcon={<ContentCopyTwoTone />}
              style={{ fontFamily: "YurukaStd" }}
              sx={{ color: dominantColor }}
            >
              copy
            </Button>
            <Button
              variant="outlined"
              onClick={download}
              startIcon={<DownloadTwoTone />}
              style={{ fontFamily: "YurukaStd" }}
              sx={{ color: dominantColor }}
            >
              download
            </Button>
          </ButtonGroup>
        </Grid>
        <Snackbar
          open={copyPopupOpen}
          autoHideDuration={2000}
          onClose={handleCopyPopupClose}
          message="Copied image to clipboard"
        />
        <Snackbar
          open={downloadPopupOpen}
          autoHideDuration={2000}
          onClose={handleDownloadPopupClose}
          message="Downlading image..."
        />
      </Grid>
      <Suspense fallback={null}>
        <Info open={infoOpen} handleClose={handleInfoClose} />
      </Suspense>
    </ThemeWrapper>
  );
}

export default App;
