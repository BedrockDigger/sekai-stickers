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
import { useState, useEffect, useCallback, useMemo } from "react";
import { FastAverageColor } from "fast-average-color";
import characters from "./characters.json";
import Canvas from "./components/Canvas";
import Picker from "./components/Picker";
import Info from "./components/Info";
import ThemeWrapper from "./components/ThemeWrapper";

const { ClipboardItem } = window;

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

  const desaturateColor = useCallback((hex) => {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Convert to HSL
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

    // Modify HSL values
    s *= 0.15; // Reduce saturation to 15%
    l = Math.max(0.12, l * 0.3); // Darken and ensure minimum brightness

    // Convert back to RGB
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
  }, []);

  useEffect(() => {
    setText(characters[character].defaultText.text);
    setPosition({
      x: characters[character].defaultText.x,
      y: characters[character].defaultText.y,
    });
    setRotate(characters[character].defaultText.r);
    setFontSize(characters[character].defaultText.s);
    setLoaded(false);

    const img = new Image();
    img.src = "/img/" + characters[character].img;
    img.onload = () => {
      const fac = new FastAverageColor();
      const color = fac.getColor(img, { algorithm: "sqrt" });
      setDominantColor(color.hex);
      setBackgroundColor(desaturateColor(color.hex));
      setLoaded(true);
    };
  }, [character, desaturateColor]);

  const angle = useMemo(() => (Math.PI * text.length) / 7, [text]);

  const draw = useCallback((ctx) => {
    ctx.canvas.width = 296;
    ctx.canvas.height = 256;

    if (loaded && document.fonts.check("12px YurukaStd")) {
      const img = new Image();
      img.src = "/img/" + characters[character].img;

      const hRatio = ctx.canvas.width / img.width;
      const vRatio = ctx.canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShift_x = (ctx.canvas.width - img.width * ratio) / 2;
      const centerShift_y = (ctx.canvas.height - img.height * ratio) / 2;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = "#212121";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(
        "Pick a character to start ↘️",
        ctx.canvas.width / 2,
        ctx.canvas.height - 10
      );
    }
  }, [loaded, character, fontSize, position, rotate, characters, text, curve, angle, spaceSize]);

  const b64toBlob = useCallback((b64Data, contentType = "image/png", sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }, []);

  const download = useCallback(async () => {
    const canvas = document.getElementsByTagName("canvas")[0];
    const link = document.createElement("a");
    link.download = `${characters[character].name}_prsk.erica.moe.png`;
    link.href = canvas.toDataURL();
    link.click();
    setDownloadPopupOpen(true);
  }, [character]);

  const copy = useCallback(async () => {
    const canvas = document.getElementsByTagName("canvas")[0];
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": b64toBlob(canvas.toDataURL().split(",")[1]),
      }),
    ]);
    setCopyPopupOpen(true);
  }, [b64toBlob]);

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
        sx={{ minHeight: "100vh", width: "100vw" }}
      >
        <Grid justifyContent="center">
          <Typography
            variant="h3"
            align="center"
            sx={{ fontFamily: "YurukaStd" }}
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
            .{" "}
            <Button
              variant="outlined"
              startIcon={<GitHub />}
              href="https://github.com/BedrockDigger/sekai-stickers"
              target="_blank"
              sx={{
                color: dominantColor,
                verticalAlign: "middle",
                marginLeft: "4px",
                padding: "2px 8px",
                height: "24px"
              }}
              size="small"
            >
              Star on GitHub
            </Button>
          </Typography>
        </Grid>
        <Grid container sx={12} justifyContent="space-evenly">
          <Grid container direction="column" xs={12} sm={7} md={4}>
            <Grid container>
              <Grid
                container
                xs={10}
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
                xs={2}
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
            md={0.5}
            sx={{
              display: "flex",
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
                sx={{ flexBasis: "60%" }}
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
                sx={{ flexBasis: "60%" }}
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
                sx={{ flexBasis: "60%" }}
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
                sx={{ flexBasis: "60%" }}
              >
                Curved text?
              </Typography>
              <Switch
                checked={curve}
                onChange={handleCurveChange}
                sx={{ color: dominantColor }}
              />
            </Grid>
            <Grid item xs={10}>
              <div style={{ height: "0.5rem" }} />
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
        <div style={{ height: "10px" }} />
        <Grid
          xs={12}
          item
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
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
        <div style={{ height: "10px" }} />
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
      <Info open={infoOpen} handleClose={handleInfoClose} />
    </ThemeWrapper>
  );
}

export default App;
