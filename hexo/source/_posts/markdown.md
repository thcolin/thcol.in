---
title: Markdown example
photos:
- https://rstudioblog.files.wordpress.com/2014/06/keep-calm-and-markdown.png
---
Just a simple personal Markdown test on my - *new and beautiful* ❤️ - hexo blog, with a full/complete GFM (or GitHub Flavored Markdown) example.

<!-- more -->

# content
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nec ultrices erat, eget rutrum risus. Nam dui tellus, lobortis condimentum nisl non, tincidunt pharetra velit. Aliquam ut erat ut odio suscipit finibus quis sed velit. Cras cursus elit vel dolor congue, id lacinia justo suscipit. Duis tincidunt sem et sapien ullamcorper, id tincidunt augue pellentesque. Nunc dignissim ornare orci, nec iaculis velit pellentesque vel. Sed eget nisi pretium diam congue fermentum. Nam mollis dui vitae mi scelerisque ultricies. Donec a neque eu lorem placerat sollicitudin. Aenean tristique faucibus nulla, nec feugiat lectus volutpat et. Praesent viverra enim a magna ornare, non vehicula turpis bibendum. Aenean egestas posuere orci, nec vehicula justo euismod at. Nam at lectus erat. In ut quam cursus libero commodo porta quis sit amet leo. Curabitur sodales dolor ut gravida mollis.

# titles
# This is head1
## This is head 2
### This is head 3
#### This is head 4
###### This is head 5

# styles
*Italic*
**bold**
`monospace`
~~strikethrough~~

# code
    # Let me re-iterate ...
    for i in 1 .. 10 { do-something(i) }

```
this is code block
```

```ruby
get '/' do
  "Hello world "
end
```

```python
# This program adds up integers in the command line
import sys
try:
    total = sum(int(arg) for arg in sys.argv[1:])
    print 'sum =', total
except ValueError:
    print 'Please supply integer arguments'
```

```javascript
// Make a request for a user with a given ID
axios.get('/user?ID=12345')
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });

// Optionally the request above could also be done as
axios.get('/user', {
    params: {
      ID: 12345
    }
  })
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });
```

```java
  public class ScaleFloatingTransition implements FloatingTransition {
    ...
    @Override
    public void applyFloating(final YumFloating yumFloating) {
      ValueAnimator alphaAnimator = ObjectAnimator.ofFloat(1.0f, 0.0f);

      alphaAnimator.setDuration(duration);
      alphaAnimator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
          @Override
          public void onAnimationUpdate(ValueAnimator valueAnimator) {
            yumFloating.setAlpha((Float) valueAnimator.getAnimatedValue());
          }
      });

      alphaAnimator.start();

      SpringHelper.createWidthBouncinessAndSpeed(0.0f, 1.0f,bounciness, speed)
      .reboundListener(new SimpleReboundListener(){
          @Override
          public void onReboundUpdate(double currentValue) {
            yumFloating.setScaleX((float) currentValue);
            yumFloating.setScaleY((float) currentValue);
          }
      }).start(yumFloating);
    }
  }
```

```php
<?php
  use thcolin\SensCritiqueAPI\Client;

  $client = new Client();

  $user = $client -> getUser('Plug_In_Papa');
  $collection = $user -> getCollection();

  $movie = $collection[0];
  echo $movie -> getTitle();
  print_r($movie -> serialize());

  $tvshow = $client -> getArtwork(438579);
  echo $tvshow -> getStoryline();
  print_r($tvshow -> serialize());

  $lists = $user -> getLists();
  $bestMovies = $lists['bestMovies'];
  $movie = $bestMovies[0];

  $list = $client -> getList(455329);
  $best2016Movie = $list[0];
?>
```

# blockquote
> Block quotes are
> written like so.
>
> They can span multiple paragraphs,
> if you like.

# break
---
***

# lists
  1. first item
    * subitem
  2. second item
  3. third item
  4. Hello

# link
[a website](http://foo.bar)
http://mukaer.com

# image
![example image](https://cdn.instructables.com/F2A/AXKK/IC37GOCL/F2AAXKKIC37GOCL.MEDIUM.jpg "An exemplary image")

---
# share

If you want to test it by yourself, here is the code (be careful, I escape code block : \`\`\`) :
```markdown
# content
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi nec ultrices erat, eget rutrum risus. Nam dui tellus, lobortis condimentum nisl non, tincidunt pharetra velit. Aliquam ut erat ut odio suscipit finibus quis sed velit. Cras cursus elit vel dolor congue, id lacinia justo suscipit. Duis tincidunt sem et sapien ullamcorper, id tincidunt augue pellentesque. Nunc dignissim ornare orci, nec iaculis velit pellentesque vel. Sed eget nisi pretium diam congue fermentum. Nam mollis dui vitae mi scelerisque ultricies. Donec a neque eu lorem placerat sollicitudin. Aenean tristique faucibus nulla, nec feugiat lectus volutpat et. Praesent viverra enim a magna ornare, non vehicula turpis bibendum. Aenean egestas posuere orci, nec vehicula justo euismod at. Nam at lectus erat. In ut quam cursus libero commodo porta quis sit amet leo. Curabitur sodales dolor ut gravida mollis.

# titles
# This is head1
## This is head 2
### This is head 3
#### This is head 4
###### This is head 5

# styles
*Italic*
**bold**
`monospace`
~~strikethrough~~

# code
    # Let me re-iterate ...
    for i in 1 .. 10 { do-something(i) }

\`\`\`
this is code block
\`\`\`

\`\`\`ruby
get '/' do
  "Hello world "
end
\`\`\`

\`\`\`python
# This program adds up integers in the command line
import sys
try:
    total = sum(int(arg) for arg in sys.argv[1:])
    print 'sum =', total
except ValueError:
    print 'Please supply integer arguments'
\`\`\`

\`\`\`javascript
// Make a request for a user with a given ID
axios.get('/user?ID=12345')
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });

// Optionally the request above could also be done as
axios.get('/user', {
    params: {
      ID: 12345
    }
  })
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });
\`\`\`

\`\`\`java
  public class ScaleFloatingTransition implements FloatingTransition {
    ...
    @Override
    public void applyFloating(final YumFloating yumFloating) {
      ValueAnimator alphaAnimator = ObjectAnimator.ofFloat(1.0f, 0.0f);

      alphaAnimator.setDuration(duration);
      alphaAnimator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
          @Override
          public void onAnimationUpdate(ValueAnimator valueAnimator) {
            yumFloating.setAlpha((Float) valueAnimator.getAnimatedValue());
          }
      });

      alphaAnimator.start();

      SpringHelper.createWidthBouncinessAndSpeed(0.0f, 1.0f,bounciness, speed)
      .reboundListener(new SimpleReboundListener(){
          @Override
          public void onReboundUpdate(double currentValue) {
            yumFloating.setScaleX((float) currentValue);
            yumFloating.setScaleY((float) currentValue);
          }
      }).start(yumFloating);
    }
  }
\`\`\`

\`\`\`php
<?php
  use thcolin\SensCritiqueAPI\Client;

  $client = new Client();

  $user = $client -> getUser('Plug_In_Papa');
  $collection = $user -> getCollection();

  $movie = $collection[0];
  echo $movie -> getTitle();
  print_r($movie -> serialize());

  $tvshow = $client -> getArtwork(438579);
  echo $tvshow -> getStoryline();
  print_r($tvshow -> serialize());

  $lists = $user -> getLists();
  $bestMovies = $lists['bestMovies'];
  $movie = $bestMovies[0];

  $list = $client -> getList(455329);
  $best2016Movie = $list[0];
?>
\`\`\`

# blockquote
> Block quotes are
> written like so.
>
> They can span multiple paragraphs,
> if you like.

# break
---
***

# lists
  1. first item
    * subitem
  2. second item
  3. third item
  4. Hello

# link
[a website](http://foo.bar)
http://mukaer.com

# image
![example image](https://cdn.instructables.com/F2A/AXKK/IC37GOCL/F2AAXKKIC37GOCL.MEDIUM.jpg "An exemplary image")
```
