import React, { Component } from 'react';
import neo4j from "neo4j-driver/lib/browser/neo4j-web";
import _ from 'lodash';
import { Dropdown } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css';
import logo from './logo.svg';
import './styles/App.css';

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      themes: [],
      themeSelected: "",
      keywords: [],
      keywordSelected: ""
    };

    this.driver = neo4j.driver('http://127.0.0.1:7474',
      neo4j.auth.basic(
        'neo4j',
        'admin'
      ),
      { encrypted: true }
    );

    this._fetchThemesKeywords();
  }

  _fetchThemesKeywords = () => {
    const session = this.driver.session();
    Promise.all([
      session.run('MATCH (t:Theme) RETURN t.name'),
      session.run('MATCH (k:Keyword) RETURN k.name')
    ])

    .then((result) => {
      console.log(result[0])
      let themes = _
        .chain(result[0].records)
        .map('_fields')
        .map(function(o) {
          return { key: o[0], text: o[0], value: o[0] };
        })
        .value();

      let keywords = _
        .chain(result[1].records)
        .map('_fields')
        .map(function(o) {
          return { key: o[0], text: o[0], value: o[0] };
        })
        .value();

      this.setState({
        themes,
        keywords
      });

      session.close();
    })
    .catch(e => {
      console.log(e);
      session.close();
    });
  }

  _handleThemeChange = (e, { value }) => {
    const session = this.driver.session();
    this.setState({
      themeSelected: value
    });

    session
      .run(
        `MATCH (Theme { name: $theme })<-[:IN_THEME]-(d:Dataset)<-[:KEYWORD_IN]-(k:Keyword)
        RETURN DISTINCT k.name`,
        { theme: this.state.themeSelected }
      )
      .then((result) => {
        var keywords = _
          .chain(result.records)
          .map('_fields')
          .map(function(o) {
            return { key: o[0], text: o[0], value: o[0] };
          })
          .value();

        this.setState({
          keywords
        });
        session.close();
      })
      .catch(e => {
        console.log(e);
        session.close();
      });
  };

  _handleKeywordChange = (e, { value }) => {
    const session = this.driver.session();
    this.setState({
      keywordSelected: value
    });
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title"> HELLO </h1>
        </header>
        <div>
          <Dropdown
            placeholder='Theme'
            fluid
            search
            selection
            options={ this.state.themes }
            value={ this.state.value }
            onChange={ this._handleThemeChange }/>
        </div>
        <div>
          <Dropdown
            placeholder='Keyword'
            fluid
            search
            selection
            options={ this.state.keywords }
            value={ this.state.value }
            onChange={ this._handleKeywordChange }/>
        </div>
      </div>
    );
  }
}

export default App;
